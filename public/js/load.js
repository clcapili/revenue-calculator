// Revenue Calculator
let revenueCalculatorBlock = document.querySelector('.revenue-calculator-block');
if (revenueCalculatorBlock) {
	let revenueCalculator = new CC.RevenueCalculator(revenueCalculatorBlock);
	revenueCalculator.calculateRevenueLoss();
}