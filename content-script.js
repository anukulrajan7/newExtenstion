// content.js

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === 'extractData') {
		login(request.password, request.brandName);
	}
	return true;
});

const loadTailwindCSS = () => {
	const link = document.createElement('link');
	link.href =
		'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css';
	link.rel = 'stylesheet';
	document.head.appendChild(link);
};

loadTailwindCSS();

// Call the function to load Tailwind CSS

const login = async (password, brandName) => {
	try {
		let { data } = await chrome.runtime.sendMessage(
			{
				action: 'login', // any
				password: password,
				brandName: brandName,
			} // optional object
		);
		chrome.storage.local.set({ userData: data });
		console.log(data);
		loadTailwindCSS();
		appendButton();
		fetchData(data?.token, data.username);
	} catch (error) {
		console.log(error);
		return null;
	}
};

const fetchData = async (tokenId, brandName) => {
	try {
		let { data } = await chrome.runtime.sendMessage({
			action: 'fetchData',
			tokenId: tokenId,
		});
		const processProductList = (productList, isCompetitor) => {
			return productList.reduce((acc, item) => {
				const masterProduct = item?.master_product;
				if (!(masterProduct?.is_competitor_product !== isCompetitor)) {
					const variants = [...(item.variants || []), masterProduct];
					const data = {
						label: masterProduct.product_name,
						data: masterProduct,
						img: masterProduct.image_url,
						id: masterProduct.master_product_id,
						variant: variants,
						feedback_status: item?.feedback_status,
					};
					acc.push(data);
				}
				return acc;
			}, []);
		};

		const filtered = processProductList(data?.product_list || [], false);
		fetchDataReviews(tokenId, data?.market_list, filtered, brandName);
	} catch (error) {
		throw new Error(error);
	}
};

const ratings = (item, productData) => {
	const product = productData?.filter((product) => {
		return product?.master_product_id === item?.id;
	})?.[0];

	return { ...item, ratings: product?.['Average Rating'][1] };
};

const createDetailUi = (productData) => {
	const element = document.getElementById('extensionUI');
	if (element) {
		element.remove();
	}

	console.log(productData);
	const container = document.createElement('div');
	container.id = 'extensionUI';
	container.style.width = '600px';
	container.style.height = '500px';
	container.style.overflow = 'auto';
	container.style.background = '#fff';
	container.classList.add(
		'fixed',
		'top-1/4',
		'right-24',
		'bg-white',
		'border',
		'p-4',
		'shadow-lg',
		'rounded-lg',
		'z-50'
	);

	// Add close button
	const closeButton = document.createElement('button');
	closeButton.innerText = '✖'; // Unicode for cross icon
	closeButton.classList.add('absolute', 'top-2', 'right-2', 'cursor-pointer');
	closeButton.addEventListener('click', function () {
		container.remove();
		createUI();
	});
	container.appendChild(closeButton);
	const detailContainer = document.createElement('div');
	detailContainer.id = 'detailContainer';
	if (productData) {
		const { listingData, overview } = productData?.brandDataFeedback?.data;
		detailContainer.innerHTML = `
	    <div class="flex justify-between items-center px-4">
			<p style="font-size: 16px;">Listing updated: ${
				listingData?.length ? 'yes' : 'N/A'
			}</p>
			<p style="font-size: 16px;">${
				overview?.total
					? `Marketing Claims Change ${overview?.count}/${overview?.total} (${overview?.precent})`
					: 'Marketing Claims N/A'
			}</p>
		</div>
		<div>
			<p class="text-center font-semibold my-2 text-lg">Top Positive</p>
			${
				overview?.topPositive?.length
					? `<table class="w-full bg-[#f2f2f2] border border-gray-300 rounded-lg text-center">
						<thead>
							<tr>
								<th class="border-b border-gray-300 p-4 text-center" style="background:#f2f2f2;">Feature</th>
								<th class="border-b border-gray-300 p-4 text-center " style="background:#f2f2f2;">Reviews</th>
								<th class="border-b border-gray-300 p-4 text-center" style="background:#f2f2f2;">Rating</th>
							</tr>
						</thead>
						<tbody>
						${overview?.topPositive
							?.map((item) => {
								return `
								<tr>
										<td class="border-b border-gray-300 border-r p-3 text-center">${item?.Feature}</td>
									<td class="border-b border-gray-300 border-r p-3 text-center">${item?.Frequency}</td>
									<td class="border-b border-gray-300 border-r p-3 text-center">${item?.Rating}</td>
								</tr>
							`;
							})
							.join('')}
						</tbody>
					</table>`
					: 'N/A'
			}
		</div>
		<div>
			<p class="text-center font-semibold my-2">Top Negative</p>
			${
				overview?.topNegative?.length
					? `<table class="w-full  border border-gray-300 rounded-lg text-center">
						<thead>
							<tr>
								<th class="border-b border-gray-300 p-3 text-center" style="background:#f2f2f2;">Feature</th>
								<th class="border-b border-gray-300 p-3 text-center " style="background:#f2f2f2;">Reviews</th>
								<th class="border-b border-gray-300 p-3 text-center" style="background:#f2f2f2;">Rating</th>
							</tr>
						</thead>
						<tbody>
						${overview?.topNegative
							?.map((item) => {
								return `
								<tr>
									<td class="border-b border-gray-300 border-r p-3 text-center">${item?.Feature}</td>
									<td class="border-b border-gray-300 border-r p-3 text-center">${item?.Frequency}</td>
									<td class="border-b border-gray-300 border-r p-3 text-center">${item?.Rating}</td>
								</tr>
							`;
							})
							.join('')}
						</tbody>
					</table>`
					: 'N/A'
			}
		</div>
	`;
	}
	container.appendChild(detailContainer);
	document.body.appendChild(container); // Append the container to the body
};

const fetchDataReviews = async (
	tokenId,
	market_list,
	product_list,
	brandName
) => {
	try {
		let { data } = await chrome.runtime.sendMessage({
			action: 'fetchReviews',
			tokenId: tokenId,
			product_list: product_list,
			market_list: market_list,
			brandName: brandName,
		});

		const [temp, tempData] = data?.result;
		if (tempData) {
			const productData = tempData?.Reviews?.monthly;
			const productListArray = [];
			product_list?.forEach((item1) => {
				productListArray?.push(ratings(item1, productData));
			});
			productListArray?.sort((item1, item2) => {
				return item2?.['ratings'] - item1['ratings'];
			});
			chrome.storage.local.set({ brandDataReviews: data });
			chrome.storage.local.set({
				brandData: {
					data: data,
					productList: productListArray,
				},
			});
			createUI();
		}
	} catch (error) {
		throw new Error(error);
	}
};

const fetchFeedback = async (tokenId, master_product_id, id) => {
	try {
		let data = await chrome.runtime.sendMessage({
			action: 'fetchFeedback',
			master_product_id: master_product_id,
			tokenId: tokenId?.token,
		});
		chrome.storage.local.set({ brandDataFeedback: data });
		showDetails();
	} catch (error) {
		throw new Error(error);
	}
};

const showDetails = () => {
	chrome.storage.local.get(
		['brandData', 'userData', 'brandDataReviews', 'brandDataFeedback'],
		function (result) {
			createDetailUi(result);
		}
	);
};

const updateUI = () => {
	chrome.storage.local.get(
		['brandData', 'userData', 'brandDataReviews'],
		function (result) {
			createInfoUi(result);
		}
	);
};

// // Function to create and append the UI
function createUI(userData) {
	// Create a container div for the UI
	const element = document.getElementById('extensionUI');
	if (element) {
		element?.remove();
	}

	const container = document.createElement('div');
	container.id = 'extensionUI';
	container.style.position = 'fixed';
	container.style.top = '20vh';
	container.style.right = '100px';
	container.style.backgroundColor = 'white';
	container.style.border = '1px solid black';
	container.style.padding = '10px';
	container.style.zIndex = '999999999';
	container.style.boxShadow = '0px 1px 8px 0px rgba(110, 110, 110, 0.10)';
	container.style.borderRadius = '10px';

	// Add close button
	const closeButton = document.createElement('button');
	closeButton.innerText = '✖'; // Unicode for cross icon
	closeButton.style.position = 'absolute';
	closeButton.style.top = '10px';
	closeButton.style.right = '5px';
	closeButton.style.cursor = 'pointer';
	closeButton.addEventListener('click', function () {
		container.remove(); // Remove the UI when close button is clicked
	});
	container.appendChild(closeButton);

	// Add content to the UI
	const content = document.createElement('div');
	content.setAttribute('id', 'contentContainer');
	container.appendChild(content);
	// Append the UI to the document body
	document.body.appendChild(container);

	updateUI();
}

const createInfoUi = (results) => {
	const contentContainer = document.getElementById('contentContainer');
	contentContainer.style.maxWidth = '600px';
	contentContainer.classList.add(
		'max-h-[600px]',
		'overflow-y-auto',
		'flex',
		'flex-col',
		'items-center',
		'justify-center'
	);
	const brandName = results.userData?.username;
	console.log(contentContainer);
	const brand = document.createElement('p');
	brand.classList.add(
		'font-medium',
		'text-center',
		'bg-red-500',
		'p-4',
		'rounded',
		'text-white'
	);
	brand.innerHTML = brandName;
	let { result } = results?.brandDataReviews;
	let { productList } = results?.brandData;

	console.log(productList, 'we aech');

	let divcontent = document.createElement('div');
	divcontent.classList.add(
		'flex',
		'flex-col',
		'gap-4',
		'p-4',
		'justify-center',
		'items-center',
		'w-full'
	);

	if (result) {
		let { monthly } = result[0]?.Ratings;
		if (monthly) {
			const table = document.createElement('table');
			table.classList.add(
				'table-auto',
				'shadow-lg',
				'w-[90%]',
				'text-center',
				'mt-4'
			);

			const thead = document.createElement('thead');
			thead.classList.add('bg-gray-200');
			thead.innerHTML = `
                <tr>
                    <th class="px-4 py-2 text-center">Product</th>
                    <th class="px-4 py-2 text-center">Avg Rating</th>
                    <th class="px-4 py-2 text-center"># of Ratings</th>
                </tr>
            `;
			table.appendChild(thead);

			const tbody = document.createElement('tbody');
			table.appendChild(tbody);

			productList.forEach((element, index) => {
				const productInfo = monthly?.filter((item) => {
					return element?.id === item?.master_product_id;
				})[0];

				if (productInfo) {
					const tr = document.createElement('tr');
					tr.classList.add('hover:bg-gray-100', 'cursor-pointer');

					tr.innerHTML = `
                        <td class="border px-y py-2 flex items-center justify-center"><img src="${
													element?.img
												}" class="w-10 h-10 object-contain mx-auto mr-2" />${element?.label?.slice(
						0,
						30
					)}</td>
                        <td class="border px-4 py-2 ">${
													productInfo?.['Average Rating'][0]
												}</td>
                        <td class="border px-4 py-2 ">${
													productInfo?.['Average Rating'][1]
												}</td>
                    `;

					tr.addEventListener('click', async () => {
						const { userData } = await chrome.storage.local.get('userData');
						fetchFeedback(
							userData,
							productInfo?.master_product_id,
							productInfo.master_product_id
						);
					});

					tbody.appendChild(tr);
				}
			});

			divcontent.appendChild(table);

			// Implementing Pagination if more than 7 products
			if (productList.length > 7) {
				let currentPage = 1;
				const itemsPerPage = 7;
				const totalPages = Math.ceil(productList.length / itemsPerPage);

				const paginate = (page) => {
					const start = (page - 1) * itemsPerPage;
					const end = start + itemsPerPage;
					const rows = tbody.querySelectorAll('tr');
					rows.forEach((row, index) => {
						row.style.display = index >= start && index < end ? '' : 'none';
					});
				};

				const paginationControls = document.createElement('div');
				paginationControls.classList.add(
					'flex',
					'justify-center',
					'mt-4',
					'gap-2'
				);

				const createPageButton = (page) => {
					const button = document.createElement('button');
					button.innerText = page;
					button.classList.add(
						'px-4',
						'py-2',
						'border',
						'rounded',
						'hover:bg-gray-200',
						'bg-white'
					);
					if (page === currentPage) {
						button.disabled = true;
						button.classList.add('bg-gray-300');
					}
					button.addEventListener('click', () => {
						if (page !== currentPage) {
							currentPage = page;
							paginate(currentPage);
							updatePaginationButtons();
						}
					});
					return button;
				};

				const updatePaginationButtons = () => {
					paginationControls.innerHTML = '';

					const prevButton = document.createElement('button');
					prevButton.innerText = 'Prev';
					prevButton.classList.add(
						'px-4',
						'py-2',
						'border',
						'rounded',
						'hover:bg-gray-200',
						'bg-white'
					);
					if (currentPage === 1) {
						prevButton.disabled = true;
						prevButton.classList.add('bg-gray-300');
					}
					prevButton.addEventListener('click', () => {
						if (currentPage > 1) {
							currentPage--;
							paginate(currentPage);
							updatePaginationButtons();
						}
					});
					paginationControls.appendChild(prevButton);

					// Determine the range of page numbers to display
					let startPage = Math.max(currentPage - 1, 1);
					let endPage = Math.min(currentPage + 1, totalPages);

					if (currentPage === 1) {
						endPage = Math.min(endPage + 1, totalPages);
					} else if (currentPage === totalPages) {
						startPage = Math.max(startPage - 1, 1);
					}

					for (let i = startPage; i <= endPage; i++) {
						paginationControls.appendChild(createPageButton(i));
					}

					const nextButton = document.createElement('button');
					nextButton.innerText = 'Next';
					nextButton.classList.add(
						'px-4',
						'py-2',
						'border',
						'rounded',
						'hover:bg-gray-200',
						'bg-white'
					);
					if (currentPage === totalPages) {
						nextButton.disabled = true;
						nextButton.classList.add('bg-gray-300');
					}
					nextButton.addEventListener('click', () => {
						if (currentPage < totalPages) {
							currentPage++;
							paginate(currentPage);
							updatePaginationButtons();
						}
					});
					paginationControls.appendChild(nextButton);
				};

				divcontent.appendChild(paginationControls);
				paginate(currentPage); // Initialize pagination
				updatePaginationButtons(); // Initialize pagination buttons
			}
		}
	}

	contentContainer.appendChild(brand);
	contentContainer.appendChild(divcontent);
};

function appendButton() {
	// Create a button element
	const button = document.createElement('button');
	button.innerText = 'Check your product with Echo';
	button.style.top = '10vh';
	button.style.right = '5vw';
	button.style.zIndex = '9999999999';
	button.classList.add(
		'fixed',
		'border',
		'border-black',
		'py-2',
		'px-4',
		'bg-blue-500',
		'text-white',
		'rounded',
		'hover:bg-blue-700',
		'transition',
		'ease-in-out',
		'duration-300',
		'animate-pulse'
	);

	button.addEventListener('click', function () {
		createUI();
		button.classList.remove('animate-pulse');
	});

	// Append the button to the body
	document.body.appendChild(button);
}
// Add Tailwind CSS animation and transition classes
const style = document.createElement('style');

style.innerHTML = `
@keyframes pulse {
  0%, 100% {
    background-color: #3b82f6;
  }
  50% {
    background-color: #60a5fa;
  }
}

.animate-pulse {
  animation: pulse 2s infinite;
}
`;
document.head.appendChild(style);
