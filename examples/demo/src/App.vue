<template>
	<div id="app" :class="{ 'has-mouse': hasMouse }" @touchstart="hasMouse = false">
		<Ribbon />
		<Flipbook
			ref="flipbook"
			v-slot="flipbook"
			class="flipbook"
			:pages="pages"
			:pages-hi-res="pagesHiRes"
			:start-page="pageNum"
			@flip-left-start="onFlipLeftStart"
			@flip-left-end="onFlipLeftEnd"
			@flip-right-start="onFlipRightStart"
			@flip-right-end="onFlipRightEnd"
			@zoom-start="onZoomStart"
			@zoom-end="onZoomEnd"
		>
			<div class="action-bar">
				<SvgIcon
					:path="mdiChevronLeftCircle"
					class="btn left"
					:class="{ disabled: !flipbook.canFlipLeft }"
					@click="flipbook.flipLeft"
				/>
				<SvgIcon
					:path="mdiMinusCircle"
					class="btn minus"
					:class="{ disabled: !flipbook.canZoomOut }"
					@click="flipbook.zoomOut"
				/>
				<span class="page-num"> Page {{ flipbook.page }} of {{ flipbook.numPages }} </span>
				<SvgIcon
					:path="mdiPlusCircle"
					class="btn plus"
					:class="{ disabled: !flipbook.canZoomIn }"
					@click="flipbook.zoomIn"
				/>
				<SvgIcon
					:path="mdiChevronRightCircle"
					class="btn right"
					:class="{ disabled: !flipbook.canFlipRight }"
					@click="flipbook.flipRight"
				/>
			</div>
		</Flipbook>
		<p class="credit">
			Photos from
			<a href="https://unsplash.com/" target="_blank">Unsplash</a>.
		</p>
	</div>
</template>

<script setup>
import SvgIcon from "vue3-icon";
import { ref, onMounted } from "vue";
import { mdiChevronLeftCircle, mdiChevronRightCircle, mdiPlusCircle, mdiMinusCircle } from "@mdi/js";
import Flipbook from "@evomark/flipbook-vue";
import Ribbon from "./Ribbon.vue";

const pages = ref([]);
const pagesHiRes = ref([]);
const hasMouse = ref(true);
const pageNum = ref(null);

function onFlipLeftStart(page) {
	console.log("flip-left-start", page);
}
function onFlipLeftEnd(page) {
	console.log("flip-left-end", page);
	window.location.hash = "#" + page;
}
function onFlipRightStart(page) {
	console.log("flip-right-start", page);
}
function onFlipRightEnd(page) {
	console.log("flip-right-end", page);
	window.location.hash = "#" + page;
}
function onZoomStart(zoom) {
	console.log("zoom-start", zoom);
}
function onZoomEnd(zoom) {
	console.log("zoom-end", zoom);
}
function setPageFromHash() {
	const n = parseInt(window.location.hash.slice(1), 10);
	if (isFinite(n)) pageNum.value = n;
}

onMounted(() => {
	window.addEventListener("keydown", (ev) => {
		const flipbook = this.$refs.flipbook;
		if (!flipbook) return;
		if (ev.keyCode == 37 && flipbook.canFlipLeft) flipbook.flipLeft();
		if (ev.keyCode == 39 && flipbook.canFlipRight) flipbook.flipRight();
	});

	// Simulate asynchronous pages initialization
	setTimeout(() => {
		pages.value = [
			null,
			"images/1.jpg",
			"images/2.jpg",
			"images/3.jpg",
			"images/4.jpg",
			"images/5.jpg",
			"images/6.jpg",
		];
		pagesHiRes.value = [
			null,
			"images-large/1.jpg",
			"images-large/2.jpg",
			"images-large/3.jpg",
			"images-large/4.jpg",
			"images-large/5.jpg",
			"images-large/6.jpg",
		];
	}, 1);

	window.addEventListener("hashchange", setPageFromHash);
	setPageFromHash();
});
</script>

<style>
@import "@evomark/flipbook-vue/style";
html,
body {
	margin: 0;
	padding: 0;
}

#app {
	font-family: "Avenir", Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	height: 100vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	background-color: #333;
	color: #ccc;
	overflow: hidden;
}

a {
	color: inherit;
}

.action-bar {
	width: 100%;
	height: 30px;
	padding: 10px 0;
	display: flex;
	justify-content: center;
	align-items: center;
}

.action-bar .btn {
	font-size: 30px;
	color: #999;
}

.action-bar .btn svg {
	bottom: 0;
}

.action-bar .btn:not(:first-child) {
	margin-left: 10px;
}

.has-mouse .action-bar .btn:hover {
	color: #ccc;
	filter: drop-shadow(1px 1px 5px #000);
	cursor: pointer;
}

.action-bar .btn:active {
	filter: none !important;
}

.action-bar .btn.disabled {
	color: #666;
	pointer-events: none;
}

.action-bar .page-num {
	font-size: 12px;
	margin-left: 10px;
}

.flipbook .viewport {
	width: 90vw !important;
	height: calc(100vh - 50px - 40px) !important;
}

.flipbook .bounding-box {
	box-shadow: 0 0 20px #000;
}

.credit {
	font-size: 12px;
	line-height: 20px;
	margin: 10px;
}
</style>
