-- Batloung Farm Fresh Produce Distribution Management System
-- MySQL 8+ schema (DIWA2110)

DROP DATABASE IF EXISTS batloung_farm;
CREATE DATABASE batloung_farm;
USE batloung_farm;

-- Suppliers (Supplier ID, business name, contact person, phone, province, address)
CREATE TABLE suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  province ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West') NOT NULL,
  address VARCHAR(255) NOT NULL,
  CONSTRAINT uq_supplier_phone UNIQUE (phone)
);

-- Fruits (Fruit ID, fruit name, description, status)
CREATE TABLE fruits (
  fruit_id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  status ENUM('Available','Unavailable','Seasonal') NOT NULL DEFAULT 'Available',
  CONSTRAINT uq_fruit_name UNIQUE (fruit_name)
);

-- Vendors (Vendor ID, vendor name, phone number, location, registration date)
CREATE TABLE vendors (
  vendor_id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  location VARCHAR(150) NOT NULL,
  registration_date DATE NOT NULL,
  CONSTRAINT uq_vendor_phone UNIQUE (phone_number)
);

-- Purchases (Purchase ID, supplier ID, purchase date, total amount)
CREATE TABLE purchases (
  purchase_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_purchase_total CHECK (total_amount >= 0)
);

-- Purchase details (Purchase detail ID, purchase ID, fruit ID, quantity, unit cost, packaging size)
CREATE TABLE purchase_details (
  purchase_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  fruit_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  packaging_size ENUM('small','medium','large') NOT NULL,
  CONSTRAINT fk_pdetail_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pdetail_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_pdetail_qty CHECK (quantity > 0),
  CONSTRAINT chk_pdetail_cost CHECK (unit_cost >= 0)
);

-- Sales (Sale ID, vendor ID, sale date, payment status, total amount)
-- Extended with payment_method, paid_amount for Part D payment management (status PAID/PARTIALLY_PAID/UNPAID)
CREATE TABLE sales (
  sale_id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  sale_date DATE NOT NULL,
  payment_status ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  payment_method ENUM('Cash','Mobile Money','Credit') NOT NULL DEFAULT 'Cash',
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_sale_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_sale_total CHECK (total_amount >= 0),
  CONSTRAINT chk_sale_paid CHECK (paid_amount >= 0 AND paid_amount <= total_amount)
);

-- Sales details (Sales detail ID, sale ID, fruit ID, packaging size, quantity, unit price)
CREATE TABLE sales_details (
  sales_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  fruit_id INT NOT NULL,
  packaging_size ENUM('small','medium','large') NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_sdetail_sale FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sdetail_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_sdetail_qty CHECK (quantity > 0),
  CONSTRAINT chk_sdetail_price CHECK (unit_price >= 0)
);

-- Stock (Stock ID, fruit ID, packaging size, available quantity)
-- Separate stock levels for small, medium and large per fruit
CREATE TABLE stock (
  stock_id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_id INT NOT NULL,
  packaging_size ENUM('small','medium','large') NOT NULL,
  available_quantity INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_stock_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_stock_fruit_size UNIQUE (fruit_id, packaging_size),
  CONSTRAINT chk_stock_qty CHECK (available_quantity >= 0)
);

CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_sales_vendor ON sales(vendor_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_status ON sales(payment_status);
CREATE INDEX idx_stock_fruit ON stock(fruit_id);
