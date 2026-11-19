-- Sample data for Batloung Farm Distribution System (DIWA2110)
-- Consistent: line totals sum to purchase/sale totals; statuses/paid amounts/balances are coherent.
USE batloung_farm;

-- Fruit companies and public office contacts verified on company websites;
-- added produce-market contacts and locations are from Google Maps listings.
-- These are sample records, not evidence of actual trading relationships.
-- ZZ2: https://www.zz2.co.za/contact-us
-- Westfalia Fruit: https://www.westfaliafruit.com/contact-us
-- Mouton Citrus: https://moutoncitrus.co.za/
-- Fruitways: https://fruitways.co.za/contact/
-- Capespan: https://www.capespan.com/contact-us-2025/
-- Joburg Market: https://www.google.com/maps/search/Joburg+Market+Johannesburg+South+Africa/
-- Fresh Produce Market, Bloemfontein: https://www.google.com/maps/search/Fresh+Produce+Market+Bloemfontein+South+Africa/
-- Fresh Produce Market - Durban: https://www.google.com/maps/search/Fresh+Produce+Market+Durban+South+Africa/
INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES
('ZZ2', 'Reception', '+27 15 395 2040', 'Limpopo', 'P.O. Box 19, Mooketsi, 0825'),
('Westfalia Fruit', 'Sales enquiries', '+27 15 309 0000', 'Limpopo', 'R36 Main Road, Tzaneen, 0850'),
('Mouton Citrus', 'Sales enquiries', '+27 22 100 0961', 'Western Cape', 'Brakfontein Landgoed, Citrusdal, 7340'),
('Fruitways', 'Marketing', '+27 21 851 9742', 'Western Cape', 'Elgin/Grabouw, Western Cape'),
('Capespan', 'South Africa office', '+27 21 917 2600', 'Western Cape', 'Old Oak Office Park, Bellville, 7530'),
('Joburg Market', 'Market office', '+27 11 992 8000', 'Gauteng', '4 Fortune St, City Deep, Johannesburg, 2049'),
('Fresh Produce Market', 'Market office', '+27 51 410 4500', 'Free State', 'Rudolf Greyling St, Linquinda, Bloemfontein, 9301'),
('Fresh Produce Market - Durban', 'Market office', '+27 31 311 5100', 'KwaZulu-Natal', '81 Flower Rd, Clairwood, Durban, 4052');

-- Fruits (required types)
INSERT INTO fruits (fruit_name, description, status) VALUES
('Apple',  'Crisp red and green apples', 'Available'),
('Banana', 'Fresh ripe bananas',         'Available'),
('Orange', 'Juicy valencia oranges',     'Available'),
('Mango',  'Sweet seasonal mangoes',     'Seasonal'),
('Grape',  'Seedless table grapes',      'Available');

-- Public business names, locations and phone numbers from Google Maps listings.
-- Registration dates are demonstration dates; they are not claimed business-registration dates.
-- Google Maps listings: https://www.google.com/maps/search/fruit+shops+Maseru,+Lesotho/
-- Google Maps listings: https://www.google.com/maps/search/fresh+vegetable+shops+Maseru,+Lesotho/
INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES
('Fruit & Veggies', '+266 2231 7494', 'MFMQ+QV4, Maseru', '2026-01-15'),
('Donny''s Fresh & Dried Fruit', '+266 5628 1601', 'Lesotho Sun Road, Maseru', '2026-02-10'),
('Mokoari Basket', '+266 5921 2202', 'Motimposo Terminus, Maseru', '2026-03-05'),
('Maba Farm Fresh Market', '+266 6838 8279', 'Taxi (4+1) Platform, Phamole Street, Maseru', '2026-04-12'),
('Shoprite Sefika', '+266 2232 7116', 'Sefika Shopping Centre, Moshoeshoe Road, Maseru', '2026-05-20');

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
