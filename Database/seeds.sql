-- Sample data for Batloung Farm Distribution System (DIWA2110)
-- Consistent: line totals sum to purchase/sale totals; statuses/paid amounts/balances are coherent.
USE batloung_farm;

-- Suppliers (across SA provinces)
INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES
('Highveld Fresh Produce', 'Thabo Mokoena', '+27 82 111 2233', 'Gauteng', 'Fox Street, Johannesburg'),
('Free State Orchards', 'Lerato Dlamini', '+27 73 444 5566', 'Free State', 'President Brand Street, Bloemfontein'),
('KZN Tropical Farms', 'Sipho Nkosi', '+27 61 777 8899', 'KwaZulu-Natal', 'West Street, Durban'),
('Cape Valley Growers', 'Anika van Wyk', '+27 84 222 3344', 'Western Cape', 'Dorp Street, Stellenbosch'),
('Limpopo Harvest Co', 'Musa Baloyi', '+27 76 555 6677', 'Limpopo', 'N1 Road, Tzaneen');

-- Fruits (required types)
INSERT INTO fruits (fruit_name, description, status) VALUES
('Apple',  'Crisp red and green apples', 'Available'),
('Banana', 'Fresh ripe bananas',         'Available'),
('Orange', 'Juicy valencia oranges',     'Available'),
('Mango',  'Sweet seasonal mangoes',     'Seasonal'),
('Grape',  'Seedless table grapes',      'Available');

-- Vendors (street vendors / small retailers in Lesotho)
INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES
('Maseru Street Market',   '+266 5801 2200', 'Maseru Central',     '2026-01-15'),
('Pioneer Retail Stall',    '+266 6203 4411', 'Pioneer Mall',       '2026-02-10'),
('Thetsane Vendors Co-op',  '+266 5904 7788', 'Thetsane',           '2026-03-05'),
('Ha Thetsane Fresh',       '+266 5012 9090', 'Ha Thetsane',        '2026-04-12'),
('Roma Roadside Sellers',   '+266 6333 1212', 'Roma',               '2026-05-20');

-- Current stock levels per fruit and packaging size (small/medium/large)
-- Includes low-stock cases (<=10) for identification
INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES
(1,'small',50),(1,'medium',30),(1,'large',20),
(2,'small',60),(2,'medium',25),(2,'large',8),
(3,'small',40),(3,'medium',35),(3,'large',18),
(4,'small',5),(4,'medium',12),(4,'large',10),
(5,'small',22),(5,'medium',4),(5,'large',15);

-- Purchases (multi-item, totals = sum(quantity * unit_cost))
-- P1 total = 20*15 + 10*50 + 30*20 + 25*18 + 15*25 = 300 + 500 + 600 + 450 + 375 = 2225.00
INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES
(1,'2026-11-10', 2225.00),
(2,'2026-11-11', 1860.00); -- P2 = 20*22 + 10*40 + 20*28 + 10*30 = 440 + 400 + 560 + 460 = 1860.00

INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
(1,1,20,15.00,'small'),
(1,1,10,50.00,'large'),
(1,2,30,20.00,'medium'),
(1,3,25,18.00,'small'),
(1,4,15,25.00,'medium'),
(2,5,20,22.00,'small'),
(2,2,10,40.00,'large'),
(2,3,20,28.00,'medium'),
(2,4,10,30.00,'small');

-- Sales (multi-item, totals = sum(quantity * unit_price), payment status/paid coherent)
-- S1 PAID Cash: total = 10*25 + 10*45 + 10*65 + 25*20 = 250 + 450 + 650 + 500 = 1850.00, paid 1850.00
-- S2 PARTIALLY_PAID Mobile Money: total = 10*55 + 10*48 + 10*22 + 5*25 = 550 + 480 + 220 + 125 = 1375.00, paid 600.00
-- S3 UNPAID Credit: total = 10*50 + 10*22 + 12*25 = 500 + 220 + 300 = 1020.00, paid 0.00
-- S4 PAID Mobile Money: total = 10*70 + 4*75 + 5*20 = 700 + 300 + 100 = 1100.00, paid 1100.00
INSERT INTO sales (vendor_id, sale_date, payment_status, payment_method, paid_amount, total_amount) VALUES
(1,'2026-11-12','PAID','Cash',1850.00,1850.00),
(2,'2026-11-13','PARTIALLY_PAID','Mobile Money',600.00,1375.00),
(3,'2026-11-14','UNPAID','Credit',0.00,1020.00),
(1,'2026-11-15','PAID','Mobile Money',1100.00,1100.00);

INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES
(1,1,'small',10,25.00),
(1,1,'medium',10,45.00),
(1,3,'large',10,65.00),
(1,2,'small',25,20.00),
(2,2,'large',10,55.00),
(2,5,'medium',10,48.00),
(2,3,'small',10,22.00),
(2,1,'small',5,25.00),
(3,4,'medium',10,50.00),
(3,3,'small',10,22.00),
(3,1,'small',12,25.00),
(4,1,'large',10,70.00),
(4,5,'large',4,75.00),
(4,2,'small',5,20.00);
