export const tableDataFormat = (DataToFormat, type, originalListingOrder) => {
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

export const tableDataFormatChanger = async (
	dataToFormat,
	type = 'marketingClaims'
) => {
	try {
		let listData = [];

		if (dataToFormat) {
			if (type === 'customerNeeds') {
				const total = dataToFormat?.reduce(
					(acc, item) => acc + Number(item?.count),
					0
				);
				listData = dataToFormat?.map((item) => {
					return {
						Feature: item.feature,
						percentage: (item?.count / total) * 100,
						total: total,
					};
				});
			} else if (type === 'marketingClaims') {
				const total = dataToFormat?.reduce(
					(acc, item) => acc + Number(item?.count),
					0
				);
				listData = dataToFormat?.map((item) => {
					return {
						Feature: item.feature,
						percentage: (item?.count / total) * 100,
						Rating: item.averageRating,
						Frequency: item?.count,
					};
				});
			} else if (type === 'positiveInfo' || type === 'negativeInfo') {
				let total = Object.values(dataToFormat?.count).reduce(
					(acc, value) => acc + Number(value),
					0
				);
				Object.keys(dataToFormat.desc).forEach((key) => {
					const count = dataToFormat.count[key] || 0;
					const desc = dataToFormat.desc[key] || '';
					const rating = dataToFormat.rating[key] || 0;
					const percentage = (count / total) * 100;
					const obj = {
						Feature: key,
						percentage: percentage,
						desc: desc,
						Rating: rating,
						Frequency: count,
					};
					listData.push(obj);
				});
			} else if (type === 'customerProfile') {
				let total = Object.values(dataToFormat?.count).reduce(
					(acc, value) => acc + Number(value),
					0
				);
				Object.keys(dataToFormat.desc).forEach((key) => {
					const count = dataToFormat.count[key] || 0;
					const desc = dataToFormat.desc[key] || '';
					const rating = dataToFormat.rating[key] || 0;
					const percentage = (count / total) * 100;
					const obj = {
						Feature: key,
						percentage: percentage,
						desc: desc,
						Rating: rating,
						Frequency: count,
					};
					listData.push(obj);
				});
			} else if (type === 'none') {
				const totalCount = Object.values(dataToFormat)?.reduce(
					(acc, dataToFormat) => acc + parseInt(dataToFormat[1]),
					0
				);
				Object.keys(dataToFormat)?.map((key) => {
					const percentage =
						Math.round(
							(dataToFormat?.[key][1] / (totalCount ? totalCount : 1)) *
								100 *
								10
						) / 10;
					const obj = {
						Feature: key,
						percentage: percentage,
						Rating: dataToFormat ? dataToFormat[key][0] : 0,
						Frequency: dataToFormat ? dataToFormat[key][1] : 0,
					};
					listData?.push(obj);
				});
			}
			listData.sort(
				(firstvalue, secondvalue) =>
					secondvalue.percentage - firstvalue.percentage
			);
			return listData;
		} else {
		}
	} catch (err) {
		console.log(err);
		return null;
	}
};
