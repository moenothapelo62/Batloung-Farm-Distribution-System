-- Reporting queries for Batloung Farm Distribution System (DIWA2110 Part D)
USE batloung_farm;

-- 1. The five most frequently sold fruits (by total quantity of boxes sold)
SELECT f.fruit_id, f.fruit_name, SUM(sd.quantity) AS total_boxes_sold
FROM sales_details sd
JOIN fruits f ON f.fruit_id = sd.fruit_id
GROUP BY f.fruit_id, f.fruit_name
ORDER BY total_boxes_sold DESC
LIMIT 5;

-- 2. Total sales revenue generated during a specified date range
-- Replace the dates as needed, e.g. '2026-11-01' AND '2026-11-30'
SELECT COALESCE(SUM(total_amount), 0) AS total_revenue,
       COUNT(*) AS sales_count
FROM sales
WHERE sale_date BETWEEN '2026-11-01' AND '2026-11-30';

-- 3. The vendor who has purchased the highest number of boxes
SELECT v.vendor_id, v.vendor_name, v.phone_number, SUM(sd.quantity) AS total_boxes_purchased
FROM sales s
JOIN vendors v ON v.vendor_id = s.vendor_id
JOIN sales_details sd ON sd.sale_id = s.sale_id
GROUP BY v.vendor_id, v.vendor_name, v.phone_number
ORDER BY total_boxes_purchased DESC
LIMIT 1;

-- 4. Current stock levels for each fruit and packaging size
SELECT f.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity
FROM stock st
JOIN fruits f ON f.fruit_id = st.fruit_id
ORDER BY f.fruit_name, FIELD(st.packaging_size,'small','medium','large');

-- 5. Outstanding balance per vendor (payment management)
SELECT v.vendor_id, v.vendor_name, v.phone_number,
       COALESCE(SUM(s.total_amount),0) AS total_sales,
       COALESCE(SUM(s.paid_amount),0) AS total_paid,
       COALESCE(SUM(s.total_amount - s.paid_amount),0) AS outstanding_balance
FROM vendors v
LEFT JOIN sales s ON s.vendor_id = v.vendor_id
GROUP BY v.vendor_id, v.vendor_name, v.phone_number
ORDER BY outstanding_balance DESC;

-- 6. Fruits with low stock levels (example threshold <= 10)
SELECT f.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity
FROM stock st
JOIN fruits f ON f.fruit_id = st.fruit_id
WHERE st.available_quantity <= 10
ORDER BY st.available_quantity ASC, f.fruit_name, st.packaging_size;
