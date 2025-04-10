const doughnutLabelsLine = {
	id: "doughnutLabelsLine",
	afterDraw(chart) {
		const {
			ctx,
			chartArea: { width, height },
		} = chart;

		const meta = chart.getDatasetMeta(0); // Get the first dataset meta
		if (!meta) return;

		const cx = width / 2;
		const cy = height / 2;
		const sum = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

		const maxLabelWidth = 90; // Maximum width for each label (adjustable)

		meta.data.forEach((datapoint, index) => {
			const { x: a, y: b, startAngle, endAngle } = datapoint;

			// Calculate the angle at the center of the arc (midway between start and end angles)
			const angle = (startAngle + endAngle) / 2;

			// Calculate the radius at the outer edge of the segment
			const outerRadius = datapoint.outerRadius;

			// Adjusted radius for positioning text inside the doughnut
			const radius = outerRadius - 50; // Move text further inside the doughnut to avoid overlap with lines
			const xPos = cx + radius * Math.cos(angle);
			const yPos = cy + radius * Math.sin(angle);

			// Adjusted radius for positioning the line
			const labelLineRadius = outerRadius + 20; // Increase space between the outer edge and the line to prevent overlap
			const xLine = cx + labelLineRadius * Math.cos(angle);
			const yLine = cy + labelLineRadius * Math.sin(angle);

			// Modify the line's starting position inside the doughnut to prevent overlap with the text
			const innerLabelLineRadius = outerRadius - 1; // Decrease the radius to shorten the line inside the doughnut
			const xInnerLine = cx + innerLabelLineRadius * Math.cos(angle);
			const yInnerLine = cy + innerLabelLineRadius * Math.sin(angle);

			// Draw the label line from the segment edge to the label
			const extraLine = xPos >= cx ? 20 : -5; // Increase the line length for more space

			// Draw the line from the inner part of the segment
			ctx.beginPath();
			ctx.moveTo(xInnerLine, yInnerLine); // Start at the inner part of the segment
			ctx.lineTo(xLine, yLine); // Draw the line from segment edge to label
			ctx.lineTo(xLine + extraLine, yLine); // Add extra length for label positioning
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 0.865385;
			ctx.stroke();

			// Choose text color based on the segment color
			const segmentColor = chart.data.datasets[0].backgroundColor[index];
			let textColor = '#070545'; // Default to dark color
			if (segmentColor === '#6C18C9') {
				textColor = 'white'; // Use white text for the purple segment
			}

			// Draw the label outside the chart (beside the lines)
			ctx.font = '12px Runda';
			ctx.fillStyle = '#070545';

			// Function to break text into multiple lines if it exceeds max width
			const breakText = (text, maxWidth) => {
				let lines = [];
				let currentLine = '';
				const words = text.split(' ');

				words.forEach((word) => {
					const testLine = currentLine + (currentLine ? ' ' : '') + word;
					const lineWidth = ctx.measureText(testLine).width;

					if (lineWidth <= maxWidth) {
						currentLine = testLine;
					} else {
						lines.push(currentLine);
						currentLine = word;
					}
				});

				lines.push(currentLine); // Add the last line
				return lines;
			};

			const labelLines = breakText(chart.data.labels[index], maxLabelWidth);

			// Draw the label lines, spaced vertically
			const labelOffset = 50; // Increase the offset for more space
			const lineHeight = 16; // Height between lines of text

			labelLines.forEach((line, i) => {
				ctx.fillText(
					line,
					xLine + extraLine + (xPos >= cx ? labelOffset : -labelOffset),
					yLine + i * lineHeight // Adjust vertical spacing for multiple lines
				);
			});

			// Display percentage inside the doughnut segment, with a slightly reduced radius
			const percentage = `${(
				(chart.data.datasets[0].data[index] * 100) /
				sum
			).toFixed(1)}%`;

			// Draw the percentage inside the doughnut
			ctx.font = '14px Runda';
			ctx.fillStyle = textColor; // Use text color based on segment color
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(percentage, xPos, yPos);
		});
	},
};

class RevenueCalculator {
	constructor(element, options) {
		this.element = element;
		this.options = Object.assign({}, RevenueCalculator.DEFAULTS, this.element.dataset, options);

		this.initTemplate();
		this.initEvents();

		this.chartInstance = null;
	}

	initTemplate() {
		this.element.innerHTML = this.options.templates.body;
	  
		this.annualRevenueInput = this.element.querySelector('#annualRevenue');
		this.claimDenialRateInput = this.element.querySelector('#claimDenialRate');
		this.daysInAccountInput = this.element.querySelector('#daysInAccount');
		this.claimsWriteOffRateInput = this.element.querySelector('#claimsWriteOffRate');
		this.calculateButton = this.element.querySelector('.btn-calculate');
		this.chartContainer = this.element.querySelector('#lossChart');
	  
		// Set default values
		this.annualRevenueInput.value = '5000000';
		this.claimDenialRateInput.value = '10';
		this.daysInAccountInput.value = '60';
		this.claimsWriteOffRateInput.value = '2';
	  
		// Disable the button initially
		this.calculateButton.disabled = true;
	  
		// Call the function to check if all fields are filled
		this.checkFields();
	  }	  

	initEvents() {
		this.calculateButton.addEventListener('click', (event) => {
			event.preventDefault();
			this.calculateRevenueLoss();
		});

		this.annualRevenueInput.addEventListener('input', () => this.checkFields());
		this.claimDenialRateInput.addEventListener('input', () => this.checkFields());
		this.daysInAccountInput.addEventListener('input', () => this.checkFields());
		this.claimsWriteOffRateInput.addEventListener('input', () => this.checkFields());
	}

	checkFields() {
		const annualRevenue = this.annualRevenueInput.value.trim();
		const denialRate = this.claimDenialRateInput.value.trim();
		const arDays = this.daysInAccountInput.value.trim();
		const writeOffRate = this.claimsWriteOffRateInput.value.trim();

		// enable the button only if all fields have valid values
		if (annualRevenue && denialRate && arDays && writeOffRate) {
			this.calculateButton.disabled = false;
		} else {
			this.calculateButton.disabled = true;
		}
	}

	calculateRevenueLoss() {
		const annualRevenue = parseFloat(this.formatCurrency(this.annualRevenueInput.value));
		const denialRate = parseFloat(this.formatCurrency(this.claimDenialRateInput.value));
		const arDays = parseFloat(this.daysInAccountInput.value);
		const writeOffRate = parseFloat(this.claimsWriteOffRateInput.value.replace('%', ''));

		const deniedClaimsLoss = annualRevenue * (denialRate / 100);
		const writeOffLoss = annualRevenue * (writeOffRate / 100);
		const delayedPaymentsLoss = annualRevenue * (arDays / 365) * 0.05;
		const totalLoss = Math.round(deniedClaimsLoss + writeOffLoss + delayedPaymentsLoss);

		this.setLostRevenue(totalLoss);

		this.renderChart(deniedClaimsLoss, writeOffLoss, delayedPaymentsLoss, totalLoss);
	}

	setLostRevenue(totalLoss) {
		window.totalLoss = totalLoss;
	}

	formatCurrency(value) {
		return value.replace(/[^0-9.]/g, '');
	}

	renderChart(deniedClaimsLoss, writeOffLoss, delayedPaymentsLoss, totalLoss) {
		const ctx = this.chartContainer.getContext('2d');
		
		this.chartContainer.height = 400;
		this.chartContainer.width = this.chartContainer.clientWidth; 
	  
		if (this.chartInstance) {
		  this.chartInstance.data.datasets[0].data = [deniedClaimsLoss, delayedPaymentsLoss, writeOffLoss];
		  this.chartInstance.update();
		} else {
			this.chartInstance = new Chart(ctx, {
				type: 'doughnut',
				data: {
					labels: ['Denied Claims Loss', 'Delayed Payments Loss', 'Write-Off Loss'],
					datasets: [{
						label: 'Revenue Loss ($)',
						data: [deniedClaimsLoss, delayedPaymentsLoss, writeOffLoss],
						backgroundColor: ['#6C18C9', '#23DBAE', '#FF9A4D'],
						borderColor: ['#FFF', '#FFF', '#FFF'],
						borderWidth: 2
					}]
				},
				options: {
					cutoutPercentage: 60,
					responsive: true,
					maintainAspectRatio: true,
					aspectRatio: 1.5,
					animation: {
						duration: 1000,
						easing: 'easeOutQuart',
					},
					plugins: {
						legend: {
							display: false
						},
						tooltip: {
							enabled: false
						},
						annotation: {
							annotations: {
								dLabel: {
									type: 'doughnutLabel',
									content: ({ chart }) => [
										'Total',
										'$' + totalLoss.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
									],
									font: [
										{ size: 20, family: 'Runda, sans-serif', weight: 'normal' },
										{ size: 30, family: 'Runda, sans-serif', weight: 'bold' }
									],
									color: ['#070545', '#070545']
								}
							}
						}
					}
				},
				
				plugins: [doughnutLabelsLine]
			});
		}
	  
		if (this.chartInstance) {
		  this.chartInstance.resize();
		}
	}	  
}

RevenueCalculator.DEFAULTS = {
  templates: {
		body: `
			<div class="card">
				<div class="card-body">
					<div class="row flex-lg-row-reverse">
						<div class="col-lg-7">
							<div class="chart-container">
								<p class="text-center fw-bold">Estimated Revenue Loss</p>
								<canvas id="lossChart"></canvas>
							</div>
						</div>

						<div class="col-lg-5">
							<form id="revenue-form">
								<div class="mb-3">
									<label for="annualRevenue" class="form-label">Annual Revenue ($)</label>
									<input type="text" class="form-control" id="annualRevenue" placeholder="$5,000,000" required>
								</div>

								<div class="mb-3">
									<label for="claimDenialRate" class="form-label">Claim Denial Rate (%)</label>
									<input type="text" class="form-control" id="claimDenialRate" placeholder="10%" required>
								</div>

								<div class="mb-3">
									<label for="daysInAccount" class="form-label">Days in Account Receivable</label>
									<input type="number" class="form-control" id="daysInAccount" placeholder="60" required>
								</div>

								<div class="mb-3">
									<label for="claimsWriteOffRate" class="form-label">Claims Write-Off Rate (%)</label>
									<input type="text" class="form-control" id="claimsWriteOffRate" placeholder="2%" required>
								</div>

								<button type="submit" class="btn btn-primary btn-calculate">Calculate Loss</button>
							</form>
						</div>
					</div>
				</div>
			</div>
		`
  	}
};

export default RevenueCalculator;