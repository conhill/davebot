module.exports = class musicQueue {
	constructor() {
		this.head = null;
		this.tail = null;
		this.count = 0;
	}

	get length() {
		return this.count;
	}

	add(data) {
		const node = {
			data: data,
			next: null
		}
		// Save the first Node
		const temp = this.head;
		// Point head to the new Node
		this.head = node;
		// Add the rest of node behind the new first Node
		this.head.next = temp;
		this.count++;
		if (this.count === 1) {
			// If first node, 
			// point tail to it as well
			this.tail = this.head;
		}
	}

	addToTail(data) {
		const node = {
			data: data,
			next: null
		}
		if (this.count === 0) {
			// If this is the first Node, assign it to head
			this.head = node;
		} else {
			// If not the first node, link it to the last node
			this.tail.next = node;
		}
		this.tail = node;
		this.count++;
	}
}