// Hardcoded price list for garments (in INR)
const GARMENT_PRICES = {
  shirt: 40,
  pants: 50,
  saree: 120,
  "t-shirt": 35,
  suit: 200,
  jacket: 150,
  dress: 100,
  kurta: 60,
  lehenga: 180,
  blazer: 160,
  jeans: 55,
  shorts: 35,
  bedsheet: 80,
  curtain: 90,
  towel: 30,
};

// Estimated delivery days based on item complexity
const DELIVERY_DAYS = {
  shirt: 1,
  pants: 1,
  "t-shirt": 1,
  jeans: 1,
  shorts: 1,
  towel: 1,
  kurta: 2,
  dress: 2,
  jacket: 2,
  blazer: 2,
  bedsheet: 2,
  curtain: 3,
  suit: 3,
  saree: 3,
  lehenga: 3,
};

function getPrice(garmentType) {
  const key = garmentType.toLowerCase().trim();
  return GARMENT_PRICES[key] || 50; // default ₹50 if unknown
}

function getDeliveryDays(garments) {
  let maxDays = 1;
  for (const g of garments) {
    const key = g.type.toLowerCase().trim();
    const days = DELIVERY_DAYS[key] || 2;
    if (days > maxDays) maxDays = days;
  }
  return maxDays;
}

module.exports = { GARMENT_PRICES, getPrice, getDeliveryDays };
