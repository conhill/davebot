import { MessageCollector } from 'discord.js';
import ytdl from 'ytdl-core';

// class musicQueue {
// 	constructor() {
// 		this.head = null;
// 		this.tail = null;
// 		this.count = 0;
// 	}

// 	get length() {
// 		return this.count;
// 	}

// 	add(data) {
// 		const node = {
// 			data: data,
// 			next: null
// 		}
// 		// Save the first Node
// 		const temp = this.head;
// 		// Point head to the new Node
// 		this.head = node;
// 		// Add the rest of node behind the new first Node
// 		this.head.next = temp;
// 		this.count++;
// 		if (this.count === 1) {
// 			// If first node, 
// 			// point tail to it as well
// 			this.tail = this.head;
// 		}
// 	}

// 	addToTail(data) {
// 		const node = {
// 			data: data,
// 			next: null
// 		}
// 		if (this.count === 0) {
// 			// If this is the first Node, assign it to head
// 			this.head = node;
// 		} else {
// 			// If not the first node, link it to the last node
// 			this.tail.next = node;
// 		}
// 		this.tail = node;
// 		this.count++;
// 	}
// }

export function play(list, connection, message) {
	// console.log(currNode);
	let dispatcher;
	// if (list.data.url === undefined) {return collect.channel.sendMessage('Queue is empty').then(() => {
	// songQueue.playing = false;
	// msg.member.voiceChannel.leave();
	// });}
	console.log(list);
	message.channel.sendMessage(`Playing: **${list.data.title}** as requested by: **${list.data.user}**`);
	
	dispatcher = connection.playStream(ytdl(list.data.url, { audioonly: true }));
	const collector = new MessageCollector(message.channel, m => m.author.id === message.author.id);

	collector.on('collect', m => { // console.log(m);
		console.log(m);
		// console.log(m.content);
		if (m.content.startsWith('pause')) {
			// m.channel.send("").then(() => {
			dispatcher.pause();
			// });
		} else if (m.content.startsWith('resume')) {
			m.channel.send('resumed').then(() => {
				dispatcher.resume();
			});
		} else if (m.content.startsWith('skip')) {
			m.channel.send('skipped').then(() => {
				dispatcher.end();
			});
		}
		// else if (m.content.startsWith(tokens.prefix + '!rtv')))
	});
	

	dispatcher.on('end', () => {
		collector.stop();
		if (list.next) {
			if (list.next != null) {
				play(list.next, connection, message);
			}
		}
	});
	
	dispatcher.on('error', (err) => {
		return message.channel.sendMessage('error: ' + err).then(() => {
			collector.stop();
			// exit(0);
			play(list.next, connection, message);
		});
	});
}