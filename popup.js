async function getTabId() {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	return [tabs.length > 0 ? tabs[0].id : null, tabs[0].url];
}

document.addEventListener('DOMContentLoaded', function () {
	const passwordInput = document.querySelector('input[type="password"]');
	const brandNameInput = document.querySelector('input[type="text"]');
	const applyButton = document.querySelector('button');

	applyButton.addEventListener('click', async function () {
		const password = passwordInput.value;
		const brandName = brandNameInput.value;
		extractProfileFunc(password, brandName);
	});
});

async function extractProfileFunc(password, brandName) {
	let [tabId, tabUrl] = await getTabId();
	if (tabId) {
		chrome.tabs.sendMessage(tabId, {
			action: 'extractData',
			password: password,
			brandName: brandName,
		});
		window.close();
	}
}
