<template>
	<div>
		<slot
			v-bind="{
				canFlipLeft,
				canFlipRight,
				canZoomIn,
				canZoomOut,
				page,
				numPages,
				flipLeft,
				flipRight,
				zoomIn,
				zoomOut,
			}"
		/>
		<div
			ref="viewport"
			class="viewport"
			:class="{
				zoom: zooming || zoom > 1,
				'drag-to-scroll': dragToScroll,
			}"
			:style="{ cursor: cursor == 'grabbing' ? 'grabbing' : 'auto' }"
			@touchmove="onTouchMove"
			@pointermove="onPointerMove"
			@mousemove="onMouseMove"
			@touchend="onTouchEnd"
			@touchcancel="onTouchEnd"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@mouseup="onMouseUp"
			@wheel="onWheel"
		>
			<div class="flipbook-container" :style="{ transform: `scale(${zoom})` }">
				<div
					class="click-to-flip left"
					:style="{ cursor: canFlipLeft ? 'pointer' : 'auto' }"
					@click="flipLeft"
				/>
				<div
					class="click-to-flip right"
					:style="{ cursor: canFlipRight ? 'pointer' : 'auto' }"
					@click="flipRight"
				/>
				<div :style="{ transform: `translateX(${centerOffsetSmoothed}px)` }">
					<img
						v-if="showLeftPage"
						class="page fixed"
						:style="{
							width: pageWidth + 'px',
							height: pageHeight + 'px',
							left: xMargin + 'px',
							top: yMargin + 'px',
						}"
						:src="pageUrlLoading(leftPage, true) || ''"
						@load="didLoadImage($event)"
					/>
					<img
						v-if="showRightPage"
						class="page fixed"
						:style="{
							width: pageWidth + 'px',
							height: pageHeight + 'px',
							left: viewWidth / 2 + 'px',
							top: yMargin + 'px',
						}"
						:src="pageUrlLoading(rightPage, true) || ''"
						@load="didLoadImage($event)"
					/>

					<div :style="{ opacity: flip.opacity }">
						<div
							v-for="[key, bgImage, lighting, bgPos, transform, z] in polygonArray"
							:key="key"
							class="polygon"
							:class="{ blank: !bgImage }"
							:style="{
								backgroundImage: bgImage && `url(${loadImage(bgImage)})`,
								backgroundSize: polygonBgSize,
								backgroundPosition: bgPos,
								width: polygonWidth,
								height: polygonHeight,
								transform: transform,
								zIndex: z,
							}"
						>
							<div v-show="lighting.length" class="lighting" :style="{ backgroundImage: lighting }" />
						</div>
					</div>
					<div
						class="bounding-box"
						:style="{
							left: boundingLeft + 'px',
							top: yMargin + 'px',
							width: boundingRight - boundingLeft + 'px',
							height: pageHeight + 'px',
							cursor: cursor,
						}"
						@touchstart="onTouchStart"
						@pointerdown="onPointerDown"
						@mousedown="onMouseDown"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Matrix from "./matrix";
import spinner from "./spinner.svg";
import { ref, computed, onMounted, onBeforeUnmount, watch, useTemplateRef } from "vue";

const easeIn = (x) => Math.pow(x, 2);
const easeOut = (x) => 1 - easeIn(1 - x);
const easeInOut = (x: number): number => (x < 0.5 ? easeIn(x * 2) / 2 : 0.5 + easeOut((x - 0.5) * 2) / 2);

const emit = defineEmits([
	"zoom-start",
	"zoom-end",
	"flip-left-start",
	"flip-left-end",
	"flip-right-start",
	"flip-right-end",
]);
const props = defineProps({
	pages: { type: Array as () => string[], required: true },
	pagesHiRes: { type: Array as () => string[], default: () => [] },
	flipDuration: { type: Number, default: 1000 },
	zoomDuration: { type: Number, default: 500 },
	zooms: { type: Array as () => number[], default: () => [1, 2, 4] },
	perspective: { type: Number, default: 2400 },
	nPolygons: { type: Number, default: 10 },
	ambient: { type: Number, default: 0.4 },
	gloss: { type: Number, default: 0.6 },
	swipeMin: { type: Number, default: 3 },
	singlePage: { type: Boolean, default: false },
	forwardDirection: {
		type: String as () => "left" | "right",
		default: "right",
		validator: (val: string) => val === "left" || val === "right",
	},
	centering: { type: Boolean, default: true },
	startPage: { type: Number, default: null },
	loadingImage: { type: String, default: spinner },
	clickToZoom: { type: Boolean, default: true },
	dragToFlip: { type: Boolean, default: true },
	wheel: { type: String as () => "scroll" | "zoom", default: "scroll" },
});

const viewportRef = useTemplateRef("viewport");
const viewWidth = ref(0);
const viewHeight = ref(0);
const imageWidth = ref(null as number | null);
const imageHeight = ref(null as number | null);
const displayedPages = ref(1);
const nImageLoad = ref(0);
const nImageLoadTrigger = ref(0);
const imageLoadCallback = ref(null as (() => void) | null);
const currentPage = ref(0);
const firstPage = ref(0);
const secondPage = ref(1);
const zoomIndex = ref(0);
const zoom = ref(1);
const zooming = ref(false);
const touchStartX = ref(null as number | null);
const touchStartY = ref(null as number | null);
const maxMove = ref(0);
const activeCursor = ref(null as string | null);
const hasTouchEvents = ref(false);
const hasPointerEvents = ref(false);
const minX = ref(Infinity);
const maxX = ref(-Infinity);
/* const preloadedImages = ref({} as Record<string, boolean>); */
const flip = ref({
	progress: 0,
	direction: null as "left" | "right" | null,
	frontImage: null as string | null,
	backImage: null as string | null,
	auto: false,
	opacity: 1,
});
const currentCenterOffset = ref(null as number | null);
const animatingCenter = ref(false);
const startScrollLeft = ref(0);
const startScrollTop = ref(0);
const scrollLeft = ref(0);
const scrollTop = ref(0);
const loadedImages = ref({} as Record<string, boolean>);

const IE = computed((): boolean => {
	return typeof navigator !== "undefined" && /Trident/.test(navigator.userAgent);
});

const canFlipLeft = computed((): boolean => {
	return props.forwardDirection === "left" ? canGoForward.value : canGoBack.value;
});

const canFlipRight = computed((): boolean => {
	return props.forwardDirection === "right" ? canGoForward.value : canGoBack.value;
});

const canZoomIn = computed((): boolean => {
	return !zooming.value && zoomIndex.value < zooms_.value.length - 1;
});

const canZoomOut = computed((): boolean => {
	return !zooming.value && zoomIndex.value > 0;
});

const numPages = computed((): number => {
	return props.pages[0] == null ? props.pages.length - 1 : props.pages.length;
});

const page = computed((): number => {
	return props.pages[0] != null ? currentPage.value + 1 : Math.max(1, currentPage.value);
});

const zooms_ = computed((): number[] => {
	return props.zooms || [1];
});

const canGoForward = computed((): boolean => {
	return !flip.value.direction && currentPage.value < props.pages.length - displayedPages.value;
});

const canGoBack = computed((): boolean => {
	return (
		!flip.value.direction &&
		currentPage.value >= displayedPages.value &&
		!(displayedPages.value === 1 && !pageUrl(firstPage.value - 1))
	);
});
const leftPage = computed((): number => {
	if (props.forwardDirection === "right" || displayedPages.value === 1) {
		return firstPage.value;
	} else {
		return secondPage.value;
	}
});

const rightPage = computed((): number => {
	return props.forwardDirection === "left" ? firstPage.value : secondPage.value;
});

const showLeftPage = computed((): boolean | null => {
	return !!pageUrl(leftPage.value);
});

const showRightPage = computed((): boolean | null => {
	return pageUrl(rightPage.value) != null && displayedPages.value === 2;
});

const cursor = computed((): string => {
	if (activeCursor.value) return activeCursor.value;
	if (IE.value) return "auto";
	if (props.clickToZoom && canZoomIn.value) return "zoom-in";
	if (props.clickToZoom && canZoomOut.value) return "zoom-out";
	if (props.dragToFlip) return "grab";
	return "auto";
});

const pageScale = computed((): number => {
	const vw = viewWidth.value / displayedPages.value;
	const xScale = vw / (imageWidth.value ?? 1);
	const yScale = viewHeight.value / (imageHeight.value ?? 1);
	const scale = xScale < yScale ? xScale : yScale;
	return scale < 1 ? scale : 1;
});

const pageWidth = computed((): number => {
	return Math.round((imageWidth.value ?? 0) * pageScale.value);
});

const pageHeight = computed((): number => {
	return Math.round((imageHeight.value ?? 0) * pageScale.value);
});

const xMargin = computed((): number => {
	return (viewWidth.value - pageWidth.value * displayedPages.value) / 2;
});

const yMargin = computed((): number => {
	return (viewHeight.value - pageHeight.value) / 2;
});

const polygonWidth = computed((): string => {
	let w = pageWidth.value / props.nPolygons;
	w = Math.ceil(w + 1 / zoom.value);
	return `${w}px`;
});

const polygonHeight = computed((): string => {
	return `${pageHeight.value}px`;
});

const polygonBgSize = computed((): string => {
	return `${pageWidth.value}px ${pageHeight.value}px`;
});

const polygonArray = computed((): any[] => {
	return makePolygonArray("front").concat(makePolygonArray("back"));
});

const boundingLeft = computed((): number => {
	if (displayedPages.value === 1) {
		return xMargin.value;
	} else {
		const x = pageUrl(leftPage.value) ? xMargin.value : viewWidth.value / 2;
		return x < minX.value ? x : minX.value;
	}
});

const boundingRight = computed((): number => {
	if (displayedPages.value === 1) {
		return viewWidth.value - xMargin.value;
	} else {
		const x = pageUrl(rightPage.value) ? viewWidth.value - xMargin.value : viewWidth.value / 2;
		return x > maxX.value ? x : maxX.value;
	}
});

const centerOffset = computed((): number => {
	let value = 0;
	if (props.centering) {
		value = Math.round(viewWidth.value / 2 - (boundingLeft.value + boundingRight.value) / 2);
	} else {
		value = 0;
	}
	return value;
});
watch(centerOffset, (c) => {
	if (currentCenterOffset.value == null && imageWidth.value != null) {
		currentCenterOffset.value = c;
	}
});

const centerOffsetSmoothed = computed((): number => {
	return Math.round(currentCenterOffset.value ?? 0);
});

const dragToScroll = computed((): boolean => {
	return !hasTouchEvents.value;
});

const scrollLeftMin = computed((): number => {
	const w = (boundingRight.value - boundingLeft.value) * zoom.value;
	if (w < viewWidth.value) {
		return (boundingLeft.value + centerOffsetSmoothed.value) * zoom.value - (viewWidth.value - w) / 2;
	} else {
		return (boundingLeft.value + centerOffsetSmoothed.value) * zoom.value;
	}
});

const scrollLeftMax = computed((): number => {
	const w = (boundingRight.value - boundingLeft.value) * zoom.value;
	if (w < viewWidth.value) {
		return (boundingLeft.value + centerOffsetSmoothed.value) * zoom.value - (viewWidth.value - w) / 2;
	} else {
		return (boundingRight.value + centerOffsetSmoothed.value) * zoom.value - viewWidth.value;
	}
});

const scrollTopMin = computed((): number => {
	const h = pageHeight.value * zoom.value;
	if (h < viewHeight.value) {
		return yMargin.value * zoom.value - (viewHeight.value - h) / 2;
	} else {
		return yMargin.value * zoom.value;
	}
});

const scrollTopMax = computed((): number => {
	const h = pageHeight.value * zoom.value;
	if (h < viewHeight.value) {
		return yMargin.value * zoom.value - (viewHeight.value - h) / 2;
	} else {
		return (yMargin.value + pageHeight.value) * zoom.value - viewHeight.value;
	}
});

const scrollLeftLimited = computed((): number => {
	return Math.min(scrollLeftMax.value, Math.max(scrollLeftMin.value, scrollLeft.value));
});

const scrollTopLimited = computed((): number => {
	return Math.min(scrollTopMax.value, Math.max(scrollTopMin.value, scrollTop.value));
});

onMounted(() => {
	window.addEventListener("resize", onResize, { passive: true });
	onResize();
	zoom.value = zooms_.value[0];
	goToPage(props.startPage);
});

onBeforeUnmount(() => {
	window.removeEventListener("resize", onResize);
});

// -- Basic viewport handling
function onResize(): void {
	const viewport = viewportRef.value as HTMLElement | undefined;
	if (!viewport) return;
	viewWidth.value = viewport.clientWidth;
	viewHeight.value = viewport.clientHeight;
	displayedPages.value = viewWidth.value > viewHeight.value && !props.singlePage ? 2 : 1;
	if (displayedPages.value === 2) currentPage.value &= ~1;
	fixFirstPage();
	minX.value = Infinity;
	maxX.value = -Infinity;
}

function fixFirstPage(): void {
	if (displayedPages.value === 1 && currentPage.value === 0 && props.pages.length && !pageUrl(0)) {
		currentPage.value++;
	}
}

function pageUrl(page: number, hiRes = false): string | null {
	if (hiRes && zoom.value > 1 && !zooming.value) {
		const url = props.pagesHiRes[page];
		if (url) return url;
	}
	return props.pages[page] || null;
}

function pageUrlLoading(page: number, hiRes = false): string | null {
	const url = pageUrl(page, hiRes);
	// High-res image doesn't use 'loading'
	if (hiRes && zoom.value > 1 && !zooming.value) return url;
	return url ? loadImage(url) : null;
}

// -- flip helpers
function flipLeft(): void {
	if (!canFlipLeft.value) return;
	flipStart("left", true);
}

function flipRight(): void {
	if (!canFlipRight.value) return;
	flipStart("right", true);
}

function makePolygonArray(face: "front" | "back"): Array<any> {
	if (!flip.value.direction) return [];

	let progress = flip.value.progress;
	let direction = flip.value.direction;

	if (displayedPages.value === 1 && direction !== props.forwardDirection) {
		progress = 1 - progress;
		direction = props.forwardDirection;
	}

	flip.value.opacity = displayedPages.value === 1 && progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

	const image = face === "front" ? flip.value.frontImage : flip.value.backImage;
	const polygonWidth = pageWidth.value / props.nPolygons;

	let pageX = xMargin.value;
	let originRight = false;

	if (displayedPages.value === 1) {
		if (props.forwardDirection === "right") {
			if (face === "back") {
				originRight = true;
				pageX = xMargin.value - pageWidth.value;
			}
		} else {
			if (direction === "left") {
				if (face === "back") {
					pageX = pageWidth.value - xMargin.value;
				} else {
					originRight = true;
				}
			} else {
				if (face === "front") {
					pageX = pageWidth.value - xMargin.value;
				} else {
					originRight = true;
				}
			}
		}
	} else {
		if (direction === "left") {
			if (face === "back") pageX = viewWidth.value / 2;
			else originRight = true;
		} else {
			if (face === "front") pageX = viewWidth.value / 2;
			else originRight = true;
		}
	}

	const pageMatrix = new Matrix();
	pageMatrix.translate(viewWidth.value / 2);
	pageMatrix.perspective(props.perspective);
	pageMatrix.translate(-viewWidth.value / 2);
	pageMatrix.translate(pageX, yMargin.value);

	let pageRotation = 0;
	if (progress > 0.5) pageRotation = -(progress - 0.5) * 2 * 180;
	if (direction === "left") pageRotation = -pageRotation;
	if (face === "back") pageRotation += 180;

	if (pageRotation) {
		if (originRight) pageMatrix.translate(pageWidth.value);
		pageMatrix.rotateY(pageRotation);
		if (originRight) pageMatrix.translate(-pageWidth.value);
	}

	let theta: number;
	if (progress < 0.5) theta = progress * 2 * Math.PI;
	else theta = (1 - (progress - 0.5) * 2) * Math.PI;
	if (theta === 0) theta = 1e-9;
	const radius = pageWidth.value / theta;

	let radian = 0;
	const dRadian = theta / props.nPolygons;
	let rotate = (dRadian / 2 / Math.PI) * 180;
	let dRotate = (dRadian / Math.PI) * 180;

	if (originRight) rotate = (-theta / Math.PI) * 180 + dRotate / 2;
	if (face === "back") {
		rotate = -rotate;
		dRotate = -dRotate;
	}

	let _minX = Infinity;
	let _maxX = -Infinity;

	const polygons: Array<any> = [];

	for (let i = 0; i < props.nPolygons; i++) {
		const bgPos = `${(i / (props.nPolygons - 1)) * 100}% 0px`;

		const m = pageMatrix.clone();
		const rad = originRight ? theta - radian : radian;
		let x = Math.sin(rad) * radius;
		if (originRight) x = pageWidth.value - x;
		let z = (1 - Math.cos(rad)) * radius;
		if (face === "back") z = -z;

		m.translate3d(x, 0, z);
		m.rotateY(-rotate);

		const x0 = m.transformX(0);
		const x1 = m.transformX(polygonWidth);
		_maxX = Math.max(Math.max(x0, x1), _maxX);
		_minX = Math.min(Math.min(x0, x1), _minX);

		const lighting = computeLighting(pageRotation - rotate, dRotate);

		radian += dRadian;
		rotate += dRotate;

		polygons.push([`${face}${i}`, image, lighting, bgPos, m.toString(), Math.abs(Math.round(z))]);
	}

	minX.value = _minX;
	maxX.value = _maxX;

	return polygons;
}

function computeLighting(rot: number, dRotate: number): string {
	const gradients: string[] = [];
	const lightingPoints = [-0.5, -0.25, 0, 0.25, 0.5];
	if (props.ambient < 1) {
		const blackness = 1 - props.ambient;
		const diffuse = lightingPoints.map((d) => (1 - Math.cos(((rot - dRotate * d) / 180) * Math.PI)) * blackness);
		gradients.push(
			`linear-gradient(to right,
            rgba(0, 0, 0, ${diffuse[0]}),
            rgba(0, 0, 0, ${diffuse[1]}) 25%,
            rgba(0, 0, 0, ${diffuse[2]}) 50%,
            rgba(0, 0, 0, ${diffuse[3]}) 75%,
            rgba(0, 0, 0, ${diffuse[4]}))
          `
		);
	}

	if (props.gloss > 0 && !IE.value) {
		const DEG = 30;
		const POW = 200;
		const specular = lightingPoints.map((d) =>
			Math.max(
				Math.cos(((rot + DEG - dRotate * d) / 180) * Math.PI) ** POW,
				Math.cos(((rot - DEG - dRotate * d) / 180) * Math.PI) ** POW
			)
		);
		gradients.push(
			`linear-gradient(to right,
            rgba(255, 255, 255, ${specular[0] * props.gloss}),
            rgba(255, 255, 255, ${specular[1] * props.gloss}) 25%,
            rgba(255, 255, 255, ${specular[2] * props.gloss}) 50%,
            rgba(255, 255, 255, ${specular[3] * props.gloss}) 75%,
            rgba(255, 255, 255, ${specular[4] * props.gloss}))
          `
		);
	}

	return gradients.join(",");
}

function flipStart(direction: "left" | "right", auto: boolean): void {
	if (direction !== props.forwardDirection) {
		if (displayedPages.value === 1) {
			flip.value.frontImage = pageUrl(currentPage.value - 1);
			flip.value.backImage = null;
		} else {
			flip.value.frontImage = pageUrl(firstPage.value);
			flip.value.backImage = pageUrl(currentPage.value - displayedPages.value + 1);
		}
	} else {
		if (displayedPages.value === 1) {
			flip.value.frontImage = pageUrl(currentPage.value);
			flip.value.backImage = null;
		} else {
			flip.value.frontImage = pageUrl(secondPage.value);
			flip.value.backImage = pageUrl(currentPage.value + displayedPages.value);
		}
	}

	flip.value.direction = direction;
	flip.value.progress = 0;

	// Double rAF used in original to force layout
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			if (flip.value.direction !== props.forwardDirection) {
				if (displayedPages.value === 2) firstPage.value = currentPage.value - displayedPages.value;
			} else {
				if (displayedPages.value === 1) firstPage.value = currentPage.value + displayedPages.value;
				else secondPage.value = currentPage.value + 1 + displayedPages.value;
			}
			if (auto) flipAuto(true);
		});
	});
}

function flipAuto(ease: boolean): void {
	const t0 = Date.now();
	const duration = props.flipDuration * (1 - flip.value.progress);
	const startRatio = flip.value.progress;
	flip.value.auto = true;
	if (flip.value.direction) {
		emit(`flip-${flip.value.direction}-start`, page.value);
	}
	const animate = () => {
		requestAnimationFrame(() => {
			const t = Date.now() - t0;
			let ratio = startRatio + t / duration;
			if (ratio > 1) ratio = 1;
			flip.value.progress = ease ? easeInOut(ratio) : ratio;
			if (ratio < 1) {
				animate();
			} else {
				if (flip.value.direction !== props.forwardDirection) {
					currentPage.value -= displayedPages.value;
				} else {
					currentPage.value += displayedPages.value;
				}
				if (flip.value.direction) {
					emit(`flip-${flip.value.direction}-end`, page.value);
				}
				if (displayedPages.value === 1 && flip.value.direction === props.forwardDirection) {
					flip.value.direction = null;
				} else {
					onImageLoad(1, () => {
						flip.value.direction = null;
					});
				}
				flip.value.auto = false;
			}
		});
	};
	animate();
}

function flipRevert(): void {
	const t0 = Date.now();
	const duration = props.flipDuration * flip.value.progress;
	const startRatio = flip.value.progress;
	flip.value.auto = true;
	const animate = () => {
		requestAnimationFrame(() => {
			const t = Date.now() - t0;
			let ratio = startRatio - (startRatio * t) / duration;
			if (ratio < 0) ratio = 0;
			flip.value.progress = ratio;
			if (ratio > 0) {
				animate();
			} else {
				firstPage.value = currentPage.value;
				secondPage.value = currentPage.value + 1;
				if (displayedPages.value === 1 && flip.value.direction !== props.forwardDirection) {
					flip.value.direction = null;
				} else {
					onImageLoad(1, () => {
						flip.value.direction = null;
					});
				}
				flip.value.auto = false;
			}
		});
	};
	animate();
}

function onImageLoad(trigger: number, cb: () => void): void {
	nImageLoad.value = 0;
	nImageLoadTrigger.value = trigger;
	imageLoadCallback.value = cb;
}

function didLoadImage(ev: Event | any): void {
	const target = (ev && (ev.target || ((ev as any).path && (ev as any).path[0]))) || null;
	if (imageWidth.value == null && target && (target as any).naturalWidth) {
		imageWidth.value = (target as any).naturalWidth;
		imageHeight.value = (target as any).naturalHeight;
		preloadImages();
	}
	if (!imageLoadCallback.value) return;
	nImageLoad.value += 1;
	if (nImageLoad.value >= nImageLoadTrigger.value) {
		const cb = imageLoadCallback.value;
		imageLoadCallback.value = null;
		if (cb) {
			cb();
		}
	}
}

function zoomIn(zoomAt: any = null): void {
	if (!canZoomIn.value) return;
	zoomIndex.value += 1;
	zoomTo(zooms_.value[zoomIndex.value], zoomAt);
}

function zoomOut(zoomAt: any = null): void {
	if (!canZoomOut.value) return;
	zoomIndex.value -= 1;
	zoomTo(zooms_.value[zoomIndex.value], zoomAt);
}

function zoomTo(zoomTarget: number, zoomAt: any = null): void {
	const viewport = viewportRef.value as HTMLElement;
	let fixedX: number, fixedY: number;
	if (zoomAt) {
		const rect = viewport.getBoundingClientRect();
		fixedX = zoomAt.pageX - rect.left;
		fixedY = zoomAt.pageY - rect.top;
	} else {
		fixedX = viewport.clientWidth / 2;
		fixedY = viewport.clientHeight / 2;
	}

	const start = zoom.value;
	const end = zoomTarget;
	const startX = viewport.scrollLeft;
	const startY = viewport.scrollTop;
	const containerFixedX = fixedX + startX;
	const containerFixedY = fixedY + startY;
	const endX = (containerFixedX / start) * end - fixedX;
	const endY = (containerFixedY / start) * end - fixedY;

	const t0 = Date.now();
	zooming.value = true;
	emit("zoom-start", zoomTarget);

	const animate = () => {
		requestAnimationFrame(() => {
			const t = Date.now() - t0;
			let ratio = t / props.zoomDuration;
			if (ratio > 1 || IE.value) ratio = 1;
			ratio = easeInOut(ratio);
			zoom.value = start + (end - start) * ratio;
			scrollLeft.value = startX + (endX - startX) * ratio;
			scrollTop.value = startY + (endY - startY) * ratio;
			if (t < props.zoomDuration) {
				animate();
			} else {
				emit("zoom-end", zoomTarget);
				zooming.value = false;
				zoom.value = zoomTarget;
				scrollLeft.value = endX;
				scrollTop.value = endY;
			}
		});
	};
	animate();
	if (end > 1) preloadImages(true);
}

function zoomAt(zoomAt: any): void {
	zoomIndex.value = (zoomIndex.value + 1) % zooms_.value.length;
	zoomTo(zooms_.value[zoomIndex.value], zoomAt);
}

function swipeStart(touch: any): void {
	touchStartX.value = touch.pageX;
	touchStartY.value = touch.pageY;
	maxMove.value = 0;
	if (zoom.value <= 1) {
		if (props.dragToFlip) activeCursor.value = "grab";
	} else {
		const vp = viewportRef.value as HTMLElement;
		startScrollLeft.value = vp ? vp.scrollLeft : 0;
		startScrollTop.value = vp ? vp.scrollTop : 0;
		activeCursor.value = "all-scroll";
	}
}

function swipeMove(touch: any): boolean | void {
	if (touchStartX.value == null) return;
	const x = touch.pageX - (touchStartX.value as number);
	const y = touch.pageY - (touchStartY.value as number);
	maxMove.value = Math.max(maxMove.value, Math.abs(x));
	maxMove.value = Math.max(maxMove.value, Math.abs(y));
	if (zoom.value > 1) {
		if (dragToScroll.value) dragScroll(x, y);
		return;
	}
	if (!props.dragToFlip) return;
	if (Math.abs(y) > Math.abs(x)) return;
	activeCursor.value = "grabbing";
	if (x > 0) {
		if (flip.value.direction == null && canFlipLeft.value && x >= props.swipeMin) flipStart("left", false);
		if (flip.value.direction === "left") {
			flip.value.progress = x / pageWidth.value;
			if (flip.value.progress > 1) flip.value.progress = 1;
		}
	} else {
		if (flip.value.direction == null && canFlipRight.value && x <= -props.swipeMin) flipStart("right", false);
		if (flip.value.direction === "right") {
			flip.value.progress = -x / pageWidth.value;
			if (flip.value.progress > 1) flip.value.progress = 1;
		}
	}
	return true;
}

function swipeEnd(touch: any): void {
	if (touchStartX.value == null) return;
	if (props.clickToZoom && maxMove.value < props.swipeMin) zoomAt(touch);
	if (flip.value.direction != null && !flip.value.auto) {
		if (flip.value.progress > 1 / 4) flipAuto(false);
		else flipRevert();
	}
	touchStartX.value = null;
	activeCursor.value = null;
}

function onTouchStart(ev: TouchEvent): void {
	hasTouchEvents.value = true;
	swipeStart((ev.changedTouches as any)[0]);
}

function onTouchMove(ev: TouchEvent): void {
	if (swipeMove((ev.changedTouches as any)[0])) {
		if (ev.cancelable) ev.preventDefault();
	}
}

function onTouchEnd(ev: TouchEvent): void {
	swipeEnd((ev.changedTouches as any)[0]);
}

function onPointerDown(ev: PointerEvent): void {
	hasPointerEvents.value = true;
	if (hasTouchEvents.value) return;
	// ignore right click
	if ((ev as any).which && (ev as any).which !== 1) return;
	swipeStart(ev);
	try {
		(ev.target as any).setPointerCapture((ev as any).pointerId);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (_) {
		/* ignore */
	}
}

function onPointerMove(ev: PointerEvent): void {
	if (!hasTouchEvents.value) swipeMove(ev);
}

function onPointerUp(ev: PointerEvent): void {
	if (hasTouchEvents.value) return;
	swipeEnd(ev);
	try {
		(ev.target as any).releasePointerCapture((ev as any).pointerId);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (_) {
		/* ignore */
	}
}

function onMouseDown(ev: MouseEvent): void {
	if (hasTouchEvents.value || hasPointerEvents.value) return;
	if ((ev as any).which && (ev as any).which !== 1) return;
	swipeStart(ev);
}

function onMouseMove(ev: MouseEvent): void {
	if (!hasTouchEvents.value && !hasPointerEvents.value) swipeMove(ev);
}

function onMouseUp(ev: MouseEvent): void {
	if (!hasTouchEvents.value && !hasPointerEvents.value) swipeEnd(ev);
}

function dragScroll(x: number, y: number): void {
	scrollLeft.value = startScrollLeft.value - x;
	scrollTop.value = startScrollTop.value - y;
}

function onWheel(ev: WheelEvent): void {
	if (props.wheel === "scroll" && zoom.value > 1 && dragToScroll.value) {
		const vp = viewportRef.value as HTMLElement;
		if (vp) {
			scrollLeft.value = vp.scrollLeft + ev.deltaX;
			scrollTop.value = vp.scrollTop + ev.deltaY;
		}
		if (ev.cancelable) ev.preventDefault();
	}

	if (props.wheel === "zoom") {
		if (ev.deltaY >= 100) {
			zoomOut(ev);
			if (ev.cancelable) ev.preventDefault();
		} else if (ev.deltaY <= -100) {
			zoomIn(ev);
			if (ev.cancelable) ev.preventDefault();
		}
	}
}

function preloadImages(hiRes = false): void {
	for (let i = currentPage.value - 3; i <= currentPage.value + 3; i++) {
		pageUrlLoading(i);
	}
	if (hiRes) {
		for (let i = currentPage.value; i < currentPage.value + displayedPages.value; i++) {
			const src = props.pagesHiRes[i];
			if (src) new Image().src = src;
		}
	}
}

function goToPage(p: number | null): void {
	if (p == null || p === page.value) return;
	if (props.pages[0] == null) {
		if (displayedPages.value === 2 && p === 1) currentPage.value = 0;
		else currentPage.value = p as number;
	} else {
		currentPage.value = (p as number) - 1;
	}
	minX.value = Infinity;
	maxX.value = -Infinity;
	currentCenterOffset.value = centerOffset.value;
}

function loadImage(url: string): string {
	if (imageWidth.value == null) return url;
	if (loadedImages.value[url]) return url;

	const img = new Image();
	img.onload = () => {
		(loadedImages.value as Record<string, boolean>)[url] = true;
	};
	img.src = url;
	return props.loadingImage;
}

watch(currentPage, (v) => {
	firstPage.value = v;
	secondPage.value = v + 1;
	preloadImages();
});

watch(centerOffset, (v) => {
	if (animatingCenter.value) return;
	const animate = () => {
		requestAnimationFrame(() => {
			const rate = 0.1;
			const diff = (v as number) - (currentCenterOffset.value as number);
			if (Math.abs(diff) < 0.5) {
				currentCenterOffset.value = v;
				animatingCenter.value = false;
			} else {
				currentCenterOffset.value = (currentCenterOffset.value as number) + diff * rate;
				animate();
			}
		});
	};
	animatingCenter.value = true;
	animate();
});

watch(scrollLeftLimited, (val: number) => {
	if (IE.value) {
		requestAnimationFrame(() => {
			(viewportRef.value as HTMLElement).scrollLeft = val;
		});
	} else {
		(viewportRef.value as HTMLElement).scrollLeft = val;
	}
});

watch(scrollTopLimited, (val: number) => {
	if (IE.value) {
		requestAnimationFrame(() => {
			(viewportRef.value as HTMLElement).scrollTop = val;
		});
	} else {
		(viewportRef.value as HTMLElement).scrollTop = val;
	}
});

watch(
	() => props.pages,
	(after: any[], before: any[]) => {
		fixFirstPage();
		if (!(before && before.length) && after && after.length) {
			if (props.startPage > 1 && after[0] == null) currentPage.value++;
		}
	}
);

watch(
	() => props.startPage,
	(p: number) => {
		goToPage(p);
	}
);
</script>

<style scoped>
.viewport {
	-webkit-overflow-scrolling: touch;
	width: 100%;
	height: 100%;
}

.viewport.zoom {
	overflow: scroll;
}

.viewport.zoom.drag-to-scroll {
	overflow: hidden;
}

.flipbook-container {
	position: relative;
	width: 100%;
	height: 100%;
	transform-origin: top left;
	user-select: none;
}

.click-to-flip {
	position: absolute;
	width: 50%;
	height: 100%;
	top: 0;
	user-select: none;
}

.click-to-flip.left {
	left: 0;
}

.click-to-flip.right {
	right: 0;
}

.bounding-box {
	position: absolute;
	user-select: none;
}

.page {
	position: absolute;
	backface-visibility: hidden;
}

.polygon {
	position: absolute;
	top: 0;
	left: 0;
	background-repeat: no-repeat;
	backface-visibility: hidden;
	transform-origin: center left;
}

.polygon.blank {
	background-color: #ddd;
}

.polygon .lighting {
	width: 100%;
	height: 100%;
}
</style>
