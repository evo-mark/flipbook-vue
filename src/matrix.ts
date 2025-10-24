import { identity, multiply, perspective, translate, translate3d, rotateY, toString } from "rematrix";

export default class Matrix {
	m: number[] = [];

	constructor(arg?: { m?: number[] } | number[] | Matrix) {
		if (arg instanceof Matrix) {
			this.m = [...arg.m];
		} else if (arg) {
			if ("m" in arg) {
				this.m = [...(arg.m ?? [])];
			} else {
				this.m = [...(arg as number[])];
			}
		} else {
			this.m = identity();
		}
	}

	clone(): Matrix {
		return new Matrix(this);
	}

	multiply(m: number[]): this {
		this.m = multiply(this.m as any, m as any);
		return this;
	}

	perspective(d: number): this {
		return this.multiply(perspective(d));
	}

	transformX(x: number): number {
		return (x * this.m[0] + this.m[12]) / (x * this.m[3] + this.m[15]);
	}

	translate(x: number, y: number | undefined = undefined): this {
		return this.multiply(translate(x, y));
	}

	translate3d(x: number, y: number, z: number): this {
		return this.multiply(translate3d(x, y, z));
	}

	rotateY(deg: number): this {
		return this.multiply(rotateY(deg));
	}

	toString(): string {
		return toString(this.m as any);
	}
}
