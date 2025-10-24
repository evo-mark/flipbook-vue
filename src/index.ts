import Flipbook from "./Flipbook.vue";

// Check if Vue is available globally
declare global {
	interface Window {
		Vue?: any;
		Flipbook?: any;
	}
}

export default Flipbook;
