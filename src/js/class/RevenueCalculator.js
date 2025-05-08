const doughnutLabelsLine = {
	id: "doughnutLabelsLine",
	afterDraw(chart) {
		// Get the current viewport width
		const viewportWidth = window.innerWidth;
		const {ctx, chartArea: { width, height }} = chart;

		const meta = chart.getDatasetMeta(0); // Get the first dataset meta
		if (!meta) return;

		const cx = width / 2;
		const cy = height / 2;
		const sum = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

		meta.data.forEach((datapoint, index) => {
			const { x: a, y: b, startAngle, endAngle } = datapoint;

			// Calculate the angle at the center of the arc (midway between start and end angles)
			const angle = (startAngle + endAngle) / 2;

			// Calculate the radius at the outer edge of the segment
			const outerRadius = datapoint.outerRadius;

			// Adjust offset based on viewport width
			const offsetPercentage = viewportWidth < 768 ? 0.25 : 0.35; // Less offset on mobile
			const minOffset = viewportWidth < 768 ? 10 : 15; // Smaller minimum offset on mobile
			const maxOffset = viewportWidth < 768 ? 30 : 50; // Smaller maximum offset on mobile
			const dynamicOffset = Math.min(maxOffset, Math.max(minOffset, outerRadius * offsetPercentage));
			const radius = outerRadius - dynamicOffset;

			const xPos = cx + radius * Math.cos(angle);
			const yPos = cy + radius * Math.sin(angle);

			// Choose text color based on the segment color
			const segmentColor = chart.data.datasets[0].backgroundColor[index];
			let textColor = '#070545'; // Default to dark color
			if (segmentColor === '#6C18C9') {
				textColor = 'white'; // Use white text for the purple segment
			}

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

const htmlLegendPlugin = {
	id: 'htmlLegend',

	afterUpdate(chart, args, options) {
		const legendContainer = document.getElementById(options.containerID);
        let listContainer = legendContainer.querySelector('ul');

        if (!listContainer) {
          listContainer = document.createElement('ul');
          listContainer.className = 'legend-list';
          legendContainer.appendChild(listContainer);
        }

		while (listContainer.firstChild) {
			listContainer.firstChild.remove();
		}

		const items = chart.options.plugins.legend.labels.generateLabels(chart);

		items.forEach(item => {
			const legendElement = document.createElement('li');
			legendElement.className = 'legend-element';

			// color box
			const legendElementColor = document.createElement('span');
			legendElementColor.className = 'legend-element-color';
			legendElementColor.style.backgroundColor = item.fillStyle;
			legendElementColor.style.borderColor = item.strokeStyle;

			// text
			const legendElementText = document.createElement('p');
			legendElementText.className = 'legend-element-text';
			legendElementText.style.color = item.fontColor;
			legendElementText.style.textDecoration = item.hidden ? 'line-through' : '';

			const text = document.createTextNode(item.text);
			legendElementText.appendChild(text);

			legendElement.appendChild(legendElementColor);
			legendElement.appendChild(legendElementText);
			listContainer.appendChild(legendElement);
		});
	}
}

class RevenueCalculator {
	constructor(element, options) {
		this.element = element;
		this.options = Object.assign({}, RevenueCalculator.DEFAULTS, this.element.dataset, options);

		this.initTemplate();
		this.initEvents();

		this.chartInstance = null;

		// Add resize handler
		this.handleResize = this.handleResize.bind(this);
		window.addEventListener('resize', this.handleResize);
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

		this.formatBigNumbers(this.annualRevenueInput);
		this.annualRevenueInput.addEventListener('input', (event) => this.formatBigNumbers(event.target) );

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

	formatBigNumbers(field) {
		const rawValue = field.value.replace(/\D/g, '');
		const formatted = new Intl.NumberFormat('en-US').format(rawValue);

		field.value = formatted;        
	}

	calculateRevenueLoss() {
		const annualRevenue = parseFloat(this.formatCurrency(this.annualRevenueInput.value));
		const denialRate = parseFloat(this.formatCurrency(this.claimDenialRateInput.value));
		const arDays = parseFloat(this.daysInAccountInput.value);
		const writeOffRate = parseFloat(this.claimsWriteOffRateInput.value.replace('%', ''));

		const deniedClaimsLoss = annualRevenue * (denialRate / 100);
		const writeOffLoss = annualRevenue * (writeOffRate / 100);
		const delayedPaymentsLoss = annualRevenue * (arDays / 365) * 0.05;

		this.renderChart(deniedClaimsLoss, writeOffLoss, delayedPaymentsLoss);
	}

	formatCurrency(value) {
		return value.replace(/[^0-9.]/g, '');
	}

	renderChart(deniedClaimsLoss, writeOffLoss, delayedPaymentsLoss) {
		const ctx = this.chartContainer.getContext('2d');
		
		this.chartContainer.height = 400;
		this.chartContainer.width = this.chartContainer.clientWidth; 
	  
		if (this.chartInstance) {
		  this.chartInstance.data.datasets[0].data = [deniedClaimsLoss, writeOffLoss, delayedPaymentsLoss];
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
							display: false,
						},
						htmlLegend: {
							containerID: 'legend-container'
						},
						tooltip: {
							enabled: false
						},
						annotation: {
							annotations: {
								dLabel: {
									type: 'doughnutLabel',
									content: ({chart}) => { //scriptable option. This will run everytime calling update()
										const data  = chart.data.datasets[0].data;
										const total = Math.round(data.reduce((a, b) => a + b, 0));
										
										return [
											'Total',
											'$' + total.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})
										];
									},
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
				
				plugins: [doughnutLabelsLine, htmlLegendPlugin]
			});
		}
	  
		if (this.chartInstance) {
		  this.chartInstance.resize();
		}
	}	  

	handleResize() {
		// Debounce the resize event for better performance
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
		}
		
		this.resizeTimeout = setTimeout(() => {
			if (this.chartInstance) {
				this.chartInstance.resize();
				this.chartInstance.update();
			}
		}, 250);
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
								<div id="legend-container"></div>
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