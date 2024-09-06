let Base_Url = 'https://dev-api.askecho.io/api/v1';

const tableDataFormat = (DataToFormat, type, originalListingOrder) => {
	try {
		if (!DataToFormat || DataToFormat === undefined || DataToFormat === null) {
			console.error(`DataToFormat is undefined or null for type: ${type}`);
			return null;
		} else {
			let listData = [];

			if (type === 'marketingClaims') {
				const total = Object.values(DataToFormat).reduce(
					(acc, { Frequency }) => acc + Frequency,
					0
				);

				listData = Object.entries(DataToFormat)
					.map(([key, { Frequency, totalRating, Rating }]) => ({
						Feature: key,
						percentage: (Frequency / total) * 100,
						totalRating,
						Rating,
						Frequency,
						original_ranking:
							originalListingOrder.findIndex((item) => item?.includes(key)) + 1,
					}))
					.sort((a, b) => b.Frequency - a.Frequency || b.Rating - a.Rating)
					.map((item, index) => ({ ...item, optimized_ranking: index + 1 }));

				// Now listData is optimized and contains the desired data structure.
			} else if (
				(type === 'negativeInfo' || type === 'positiveInfo') &&
				DataToFormat?.count
			) {
				let obj = {};
				const total = Object.values(DataToFormat?.count).reduce(
					(acc, value) => acc + value,
					0
				);
				Object.keys(DataToFormat?.count).map((key) => {
					const desc = DataToFormat.desc[key];
					const frequency = DataToFormat.count[key];
					const percentage = (frequency / total) * 100;
					const rating = DataToFormat.rating[key];
					obj = {
						Feature: key,
						percentage: percentage,
						Rating: rating,
						desc: desc,
						Frequency: frequency,
					};
					listData.push(obj);
				});
			} else if (type === 'customerProfile' && DataToFormat?.count) {
				let obj = {};
				const total = Object.values(DataToFormat?.count).reduce(
					(acc, value) => acc + value,
					0
				);
				Object.keys(DataToFormat?.count).map((key) => {
					const frequency = DataToFormat.count[key];
					const percentage = (frequency / total) * 100;
					const rating = DataToFormat.rating[key];
					obj = {
						Feature: key,
						percentage: percentage,
						Rating: rating,
						Frequency: frequency,
					};
					listData.push(obj);
				});
			} else if (type === 'none') {
				const totalCount = Object.values(DataToFormat)?.reduce(
					(acc, DataToFormat) => acc + parseInt(DataToFormat[0]),
					0
				);
				Object.keys(DataToFormat)?.map((key) => {
					const percentage =
						Math.round(
							(DataToFormat?.[key][0] / (totalCount ? totalCount : 1)) *
								100 *
								10
						) / 10;
					const obj = {
						Feature: key,
						percentage: percentage,
						Rating: DataToFormat ? DataToFormat[key][1] : 0,
						Frequency: DataToFormat ? DataToFormat[key][0] : 0,
					};
					listData?.push(obj);
				});
			} else if (type === 'data') {
				const totalCount = DataToFormat?.reduce(
					(acc, Data) => acc + parseInt(Data[1]),
					0
				);
				DataToFormat?.map((key) => {
					const percentage =
						Math.round((key[1] / (totalCount ? totalCount : 1)) * 100 * 10) /
						10;
					const obj = {
						Feature: key[0],
						percentage: percentage,
						Rating: key[2],
						Frequency: key[1],
					};
					listData?.push(obj);
				});
			}

			listData?.sort((a, b) => {
				// First, sort based on Frequency in descending order
				const frequencyComparison = b?.Frequency - a?.Frequency;
				if (frequencyComparison !== 0) {
					return frequencyComparison;
				}
				// If Frequency is equal, then sort based on Rating in descending order
				return b?.Rating - a?.Rating;
			});
			return listData;
		}
	} catch (error) {
		console.error(`Error in tableDataFormat for type: ${type}`, error);
		// Handle the error gracefully, e.g., return a default value or an empty array
		return [];
	}
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === 'login') {
		if (request.password && request.brandName) {
			// Received user input from the popup
			console.log('Received password:', request.password);
			console.log('Received brand name:', request.brandName);
			// Simulated data fetching (replace with actual API call)
			const fetchData = async () => {
				const requestOptions = {
					method: 'POST',
					headers: new Headers({
						'Content-Type': 'application/json',
					}),
					body: JSON.stringify({
						username: request.brandName,
						password: request.password,
					}),
				};

				fetch(Base_Url + '/auth/login/', requestOptions)
					.then((response) => response.json())
					.then((response) => {
						if (response) {
							sendResponse({ success: true, data: response });
						}
					})
					.catch((error) => {
						sendResponse({ success: true, data: error });
					});
			};

			fetchData();
			// Return true to indicate that the response will be sent asynchronously
		}
	} else if (request.action === 'fetchData') {
		const requestOptions = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Token ${request?.tokenId}`,
			},
		};
		fetch(Base_Url + '/info/get-all-user-data', requestOptions)
			.then((response) => response.json())
			.then((response) => {
				if (response) {
					sendResponse({ success: true, data: response });
				}
			})
			.catch((error) => {
				sendResponse({ success: true, data: error });
			});
	} else if (request.action === 'fetchFeedback') {
		const requestBody = {
			method: 'POST',
			headers: new Headers({
				'Content-Type': 'application/json',
				Authorization: `Token ${request.tokenId}`,
			}),
			body: JSON.stringify({
				master_product_id: request.master_product_id,
			}),
		};
		try {
			// Fetch all data in parallel
			Promise.all([
				fetchFeedbackOverviewData(requestBody),
				fetchListingOptimizationData(requestBody),
			])
				.then(([overview, listingData]) => {
					// Send response after all data is fetched
					sendResponse({
						success: true,
						data: {
							overview: overview,
							listingData: listingData,
						},
					});
				})
				.catch((error) => {
					// Handle errors
					sendResponse({ success: false, data: error });
				});
		} catch (error) {
			// Handle synchronous errors
			sendResponse({ success: false, data: error });
		}
	} else if (request.action === 'fetchReviews') {
		console.log('called');
		requestData = {
			marketplaces: [],
			filters: {},
			marketList: request.market_list,
			productList: request.product_list,
			username: request.brandName,
		};
		const requestOptions = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Token ${request?.tokenId}`,
			},
			body: JSON.stringify(requestData),
		};

		fetch(Base_Url + '/table/get-brand-page-nps-data', requestOptions)
			.then((response) => response.json())
			.then((response) => {
				if (response) {
					sendResponse({ success: true, data: response });
				}
			})
			.catch((error) => {
				sendResponse({ success: true, data: error });
			});
	}
	return true;
});

const fetchFeedbackOverviewData = async (requestBody) => {
	let topPositive = [];
	let topNegative = [];
	let countChange = 0;
	let total = 0;
	let precent = 0;
	try {
		// Simulated API call (Replace with your actual API call)

		const response = await fetch(
			Base_Url + '/table/get-feedback-overview-data',
			requestBody
		);
		if (response.ok) {
			const overviewInfo = await response.json();

			if (overviewInfo) {
				const marketing_claims_order = overviewInfo.marketing_claims_order;
				let negativeDataTable = overviewInfo?.neg_data
					? tableDataFormat(overviewInfo.neg_data, 'negativeInfo')
					: null;
				let positiveDataTable = overviewInfo?.pos_data
					? tableDataFormat(overviewInfo.pos_data, 'positiveInfo')
					: null;
				let marketingDataTable = overviewInfo?.marketing_claims
					? tableDataFormat(
							overviewInfo.marketing_claims,
							'marketingClaims',
							marketing_claims_order
					  )
					: null;

				// Check if data is available before updating state
				if (negativeDataTable && positiveDataTable && marketingDataTable) {
					marketingDataTable?.forEach((item) => {
						if (item?.original_ranking !== item?.optimized_ranking) {
							countChange += 1;
						}
					});

					total = marketingDataTable?.length;
					precent = Math.round((countChange / total) * 100);
					topPositive = positiveDataTable?.slice(0, 3);
					topNegative = negativeDataTable?.slice(0, 3);
				}
			}
		} else {
			console.error(
				'Error in getting category information: ' + response.message
			);
		}
	} catch (error) {
		console.error('Error in Fetching category data: ' + error.message);
	}
	return {
		count: countChange,
		topPositive: topPositive,
		topNegative,
		total: total,
		precent: precent,
	};
};

// Function to fetch listing optimization data
const fetchListingOptimizationData = async (requestBody) => {
	try {
		const response = await fetch(
			Base_Url + '/table/get-listing-optimization-master-product-data',
			requestBody
		);
		const listingResponse = await response.json();
		if (listingResponse) {
			return Object.values(listingResponse?.response_data);
		} else {
			throw new Error('Data not found');
		}
	} catch (error) {
		console.error('Error in Fetching category data: ' + error);
		return null;
	}
};

// Function to fetch negative analysis data
const fetchNegativeAnalysisData = async (requestBody) => {
	try {
		const response = await fetch(
			Base_Url + '/table/get-feedback-analysis-negative',
			requestBody
		);
		if (response.ok) {
			const data = await response.json();
			return data;
		} else {
			throw new Error('Error while fetching products.');
		}
	} catch (error) {
		console.error('Error in Fetching category data: ' + error.message);
	}
};

// Function to fetch positive analysis data
const fetchPositiveAnalysisData = async (requestBody) => {
	try {
		const response = await fetch(
			Base_Url + '/table/get-feedback-analysis-positive',
			requestBody
		);
		if (response.ok) {
			const data = await response.json();
			return data;
		} else {
			throw new Error('Error while fetching products.');
		}
	} catch (error) {
		console.error('Error in Fetching category data: ' + error.message);
	}
};
