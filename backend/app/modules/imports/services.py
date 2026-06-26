import io
import csv
import json
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import openpyxl

from app.models import ImportJob, ImportLog
from app.models.supplier import Supplier
from app.models.inventory import Product, Category
from app.database import tenant_context

# Intelligent field mapping for standard formats and Zoho Books
FIELD_MAPPING = {
    "suppliers": {
        "name": ["name", "contact_name", "display_name", "supplier_name"],
        "company_name": ["company_name", "company", "supplier_company"],
        "email": ["email", "email_address", "supplier_email"],
        "phone": ["phone", "mobile", "telephone", "contact_number"],
        "address": ["address", "street", "location", "billing_address"],
        "gst_number": ["gst_number", "gst", "gst_no", "gstin"],
        "pan_number": ["pan_number", "pan", "pan_no"],
        "contact_person": ["contact_person", "contact", "attention"],
        "rating": ["rating", "supplier_rating"],
        "notes": ["notes", "remarks", "description"]
    },
    "products": {
        "sku": ["sku", "item_code", "product_code", "sku_code"],
        "name": ["name", "product_name", "item_name"],
        "description": ["description", "item_description", "prod_desc"],
        "category_name": ["category", "category_name", "item_category"],
        "unit": ["unit", "uom", "measurement_unit"],
        "cost_price": ["cost_price", "purchase_rate", "purchase_price", "cost"],
        "selling_price": ["selling_price", "rate", "selling_rate", "price"],
        "reorder_level": ["reorder_level", "reorder_point", "min_stock"]
    }
}

def parse_file(content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parses CSV, JSON (including Zoho format), or Excel files into list of dictionaries.
    """
    filename = filename.lower()
    records = []

    if filename.endswith(".csv"):
        # Handle UTF-8 with BOM automatically via utf-8-sig
        text_content = content.decode("utf-8-sig")
        f = io.StringIO(text_content)
        reader = csv.DictReader(f)
        for row in reader:
            records.append({k.strip(): v.strip() if v else "" for k, v in row.items() if k})

    elif filename.endswith(".json"):
        data = json.loads(content.decode("utf-8"))
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict):
            # Zoho Books compatibility check
            if "contacts" in data and isinstance(data["contacts"], list):
                records = data["contacts"]
            elif "items" in data and isinstance(data["items"], list):
                records = data["items"]
            else:
                raise ValueError("JSON dictionary must contain a list under 'contacts' or 'items'.")
        else:
            raise ValueError("Unsupported JSON root format. Must be array or object.")

    elif filename.endswith((".xlsx", ".xls")):
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet = wb.active
        headers = []
        for cell in sheet[1]:
            headers.append(str(cell.value).strip() if cell.value is not None else "")
        
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not any(row):  # skip empty rows
                continue
            row_dict = {}
            for i, val in enumerate(row):
                if i < len(headers) and headers[i]:
                    row_dict[headers[i]] = str(val).strip() if val is not None else ""
            records.append(row_dict)
    else:
        raise ValueError("Unsupported file format. Must be CSV, Excel, or JSON.")

    return records

def map_row(row: Dict[str, Any], target_type: str) -> Dict[str, Any]:
    """
    Maps raw dictionary keys to database model keys based on pre-defined mappings.
    """
    mapped = {}
    mapping = FIELD_MAPPING.get(target_type, {})
    
    # Normalize row keys to lowercase/stripped for matching
    norm_row = {k.lower().replace(" ", "_").replace("-", "_"): v for k, v in row.items()}
    
    for db_key, synonyms in mapping.items():
        for syn in synonyms:
            syn_norm = syn.lower().replace(" ", "_").replace("-", "_")
            if syn_norm in norm_row:
                mapped[db_key] = norm_row[syn_norm]
                break
        if db_key not in mapped:
            mapped[db_key] = None
            
    return mapped

def validate_row(mapped_row: Dict[str, Any], target_type: str) -> Tuple[bool, Optional[str]]:
    """
    Performs field validations and returns (is_valid, error_message).
    """
    if target_type == "suppliers":
        if not mapped_row.get("name"):
            return False, "Supplier Name is required."
        if not mapped_row.get("company_name"):
            return False, "Company Name is required."
        email = mapped_row.get("email")
        if not email:
            return False, "Email is required."
        if "@" not in email:
            return False, "Invalid email format."
            
    elif target_type == "products":
        if not mapped_row.get("sku"):
            return False, "SKU code is required."
        if not mapped_row.get("name"):
            return False, "Product Name is required."
        
        try:
            cost = float(mapped_row.get("cost_price") or 0)
            if cost < 0:
                return False, "Cost price cannot be negative."
        except ValueError:
            return False, "Cost price must be a valid number."

        try:
            selling = float(mapped_row.get("selling_price") or 0)
            if selling < 0:
                return False, "Selling price cannot be negative."
        except ValueError:
            return False, "Selling price must be a valid number."
            
    return True, None

async def check_duplicate(db: AsyncSession, mapped_row: Dict[str, Any], target_type: str) -> Tuple[bool, Optional[str]]:
    """
    Checks if a duplicate record already exists in the tenant database context.
    Returns (is_duplicate, existing_record_id).
    """
    if target_type == "suppliers":
        email = mapped_row.get("email")
        stmt = select(Supplier).where(Supplier.email == email)
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            return True, existing.id
            
    elif target_type == "products":
        sku = mapped_row.get("sku")
        stmt = select(Product).where(Product.sku == sku)
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            return True, existing.id
            
    return False, None

async def import_row(
    db: AsyncSession, 
    mapped_row: Dict[str, Any], 
    target_type: str, 
    on_duplicate: str,
    tenant_id: str
) -> Tuple[str, str, Optional[Dict[str, Any]], Optional[str]]:
    """
    Imports a single row. Returns:
    - status: "success", "skipped", "error"
    - imported_id: ID of new/updated entity
    - original_data: Original dict (if overwritten) or None
    - error_message: str or None
    """
    # 1. Validation
    is_valid, err_msg = validate_row(mapped_row, target_type)
    if not is_valid:
        return "error", "", None, err_msg

    # 2. Duplicate detection
    is_dup, existing_id = await check_duplicate(db, mapped_row, target_type)
    
    if is_dup:
        if on_duplicate == "skip":
            return "skipped", existing_id, None, "Row skipped: entity already exists."
        elif on_duplicate == "error":
            return "error", existing_id, None, f"Row failed: duplicate detected (ID: {existing_id})."
        elif on_duplicate == "overwrite":
            # Proceed to update
            pass
        else:
            return "error", existing_id, None, f"Invalid on_duplicate option: {on_duplicate}"

    # 3. Insert or Update
    try:
        if target_type == "suppliers":
            if is_dup and existing_id:
                # Fetch existing
                stmt = select(Supplier).where(Supplier.id == existing_id)
                res = await db.execute(stmt)
                entity = res.scalars().first()
                if not entity:
                    return "error", "", None, "Existing supplier not found during update."
                
                # Capture original values for rollback
                original_data = {
                    "name": entity.name,
                    "company_name": entity.company_name,
                    "email": entity.email,
                    "phone": entity.phone,
                    "address": entity.address,
                    "gst_number": entity.gst_number,
                    "pan_number": entity.pan_number,
                    "contact_person": entity.contact_person,
                    "rating": float(entity.rating) if entity.rating is not None else 5.0,
                    "status": entity.status,
                    "notes": entity.notes
                }
                
                # Overwrite
                entity.name = mapped_row.get("name")
                entity.company_name = mapped_row.get("company_name")
                entity.email = mapped_row.get("email")
                entity.phone = mapped_row.get("phone")
                entity.address = mapped_row.get("address")
                entity.gst_number = mapped_row.get("gst_number")
                entity.pan_number = mapped_row.get("pan_number")
                entity.contact_person = mapped_row.get("contact_person")
                if mapped_row.get("rating") is not None:
                    entity.rating = float(mapped_row.get("rating"))
                entity.notes = mapped_row.get("notes")
                
                await db.flush()
                return "success", existing_id, original_data, None
            else:
                # Create new
                new_supplier = Supplier(
                    tenant_id=tenant_id,
                    name=mapped_row.get("name"),
                    company_name=mapped_row.get("company_name"),
                    email=mapped_row.get("email"),
                    phone=mapped_row.get("phone"),
                    address=mapped_row.get("address"),
                    gst_number=mapped_row.get("gst_number"),
                    pan_number=mapped_row.get("pan_number"),
                    contact_person=mapped_row.get("contact_person"),
                    rating=float(mapped_row.get("rating") or 5.0),
                    notes=mapped_row.get("notes"),
                    status="active"
                )
                db.add(new_supplier)
                await db.flush()
                return "success", new_supplier.id, None, None
                
        elif target_type == "products":
            # For category: if category_name is present, find or create it
            category_id = None
            category_name = mapped_row.get("category_name")
            if category_name:
                stmt = select(Category).where(Category.name == category_name)
                res = await db.execute(stmt)
                cat = res.scalars().first()
                if cat:
                    category_id = cat.id
                else:
                    new_cat = Category(tenant_id=tenant_id, name=category_name)
                    db.add(new_cat)
                    await db.flush()
                    category_id = new_cat.id

            if is_dup and existing_id:
                # Fetch existing product
                stmt = select(Product).where(Product.id == existing_id)
                res = await db.execute(stmt)
                entity = res.scalars().first()
                if not entity:
                    return "error", "", None, "Existing product not found during update."
                
                # Capture original values for rollback
                original_data = {
                    "sku": entity.sku,
                    "name": entity.name,
                    "description": entity.description,
                    "category_id": entity.category_id,
                    "unit": entity.unit,
                    "cost_price": float(entity.cost_price),
                    "selling_price": float(entity.selling_price),
                    "reorder_level": entity.reorder_level
                }
                
                # Overwrite
                entity.name = mapped_row.get("name")
                entity.description = mapped_row.get("description")
                if category_id:
                    entity.category_id = category_id
                if mapped_row.get("unit"):
                    entity.unit = mapped_row.get("unit")
                entity.cost_price = float(mapped_row.get("cost_price"))
                entity.selling_price = float(mapped_row.get("selling_price"))
                if mapped_row.get("reorder_level") is not None:
                    entity.reorder_level = int(mapped_row.get("reorder_level"))
                
                await db.flush()
                return "success", existing_id, original_data, None
            else:
                # Create new product
                new_product = Product(
                    tenant_id=tenant_id,
                    sku=mapped_row.get("sku"),
                    name=mapped_row.get("name"),
                    description=mapped_row.get("description"),
                    category_id=category_id,
                    unit=mapped_row.get("unit") or "pcs",
                    cost_price=float(mapped_row.get("cost_price")),
                    selling_price=float(mapped_row.get("selling_price")),
                    reorder_level=int(mapped_row.get("reorder_level") or 10)
                )
                db.add(new_product)
                await db.flush()
                return "success", new_product.id, None, None
                
    except Exception as e:
        await db.rollback()
        return "error", "", None, f"Database write failed: {str(e)}"

    return "error", "", None, "Unhandled import path."

async def process_import_job_bg(db: AsyncSession, job_id: str, tenant_id: str, options: dict):
    """
    FastAPI Background task execution to process rows and log result.
    """
    # Force set tenant context in background loop
    token = tenant_context.set(tenant_id)
    try:
        # Load import job (we need to skip_tenant_filter since context might be weird, but actually standard filtering is fine)
        stmt = select(ImportJob).where(ImportJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if not job or job.status != "processing":
            return
            
        records = job.payload or []
        on_duplicate = options.get("on_duplicate", "skip")
        
        success_count = 0
        error_count = 0
        
        for idx, raw_record in enumerate(records):
            row_num = idx + 2 # Header is row 1
            mapped = map_row(raw_record, job.target_type)
            
            status, imported_id, original_data, err_msg = await import_row(
                db=db,
                mapped_row=mapped,
                target_type=job.target_type,
                on_duplicate=on_duplicate,
                tenant_id=tenant_id
            )
            
            # Save ImportLog
            log_item = ImportLog(
                tenant_id=tenant_id,
                import_job_id=job.id,
                row_number=row_num,
                status=status,
                message=err_msg,
                imported_id=imported_id if imported_id else None,
                original_data=original_data,
            )
            db.add(log_item)
            
            if status == "success":
                success_count += 1
            elif status == "error":
                error_count += 1
            
            # Flush periodically
            if idx % 50 == 0:
                await db.flush()
                
        # Finalize job status
        job.processed_rows = success_count
        job.error_rows = error_count
        job.status = "completed" if error_count == 0 else "failed"
        if success_count > 0 and error_count > 0:
            job.status = "completed" # Partial success is still marked completed (or completed with errors)
        
        await db.commit()
    except Exception as e:
        await db.rollback()
        # Mark job as failed on general exception
        stmt = select(ImportJob).where(ImportJob.id == job_id)
        res = await db.execute(stmt)
        job = res.scalars().first()
        if job:
            job.status = "failed"
            await db.commit()
    finally:
        tenant_context.reset(token)
