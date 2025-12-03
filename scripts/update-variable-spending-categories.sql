-- Update existing categories to set is_variable_spending flag
-- Run this after the migration has been applied

UPDATE categories SET is_variable_spending = true WHERE name IN (
    'Supermarkt',
    'Slager',
    'Bakker',
    'Speciaalzaken',
    'Koffie',
    'Lunch',
    'Uit eten',
    'Bestellen',
    'Uitgaan/bars',
    'Brandstof',
    'Openbaar vervoer',
    'Parkeren',
    'Taxi & deelvervoer',
    'Persoonlijke verzorging',
    'Huisdierenverzorging'
);

-- Verify the update
SELECT name, is_variable_spending FROM categories WHERE is_variable_spending = true;

