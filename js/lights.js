'use strict';
import {
	Discover,
	IDevice,
	StartFlowAction,
	FlowState,
	Yeelight,
	logger
} from 'yeelight-awesome';

const y = require('yeelight-awesome');

const discover = new y.Discover({
	port: 55443,
	debug: true
});

class RBGLight {
	constructor(state, host, port, device) {
		this.state = 'off';
		this.host = host;
		this.device = device;
		this.port = port;
	}

	connectLight() {
		this.device = new Yeelight({
			lightIp: this.host,
			lightPort: this.port
		}, logger);
		this.device.connect();
		this.device.on('connected', () => {
			console.log('connect light');
			this.state = 'connected';
		});
	}

	getState() {
		return this.state;
	}

	getDevice() {
		return this.device;
	}
}

class SetLights {
	constructor(lights, command) {
		this.lights = [];
		this.command = command;
	}

	pushLight(light) {
		this.lights.push(light);
	}

	getLights() {
		return this.lights;
	}

	changeLights(lightDisplay) {
		var commands = {
			//duration, mode, value, brightness
			'hey_dave': function () {
				this.lights.forEach(function(light){
					light.startColorFlow([
						new FlowState(300, 2, 8987966, 100),
						new FlowState(300, 2, 3826054, 30),
					], StartFlowAction.LED_STAY, 11);
				});
			},
			'seeing_red': function () {
				this.lights.forEach(function(light){
					light.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
					light.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
					light.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
				});
			},
			'default': function () {
				console.log('NOT A COMMAND');
			}
		};

		if (commands[lightDisplay]) {
			return commands[lightDisplay]();
		} else {
			return commands.default;
		}
	}
}

module.exports.changeLightColor = function (lightDisplay) {
	var commands = {
		//duration, mode, value, brightness
		'hey_dave': function () {
			// console.log(global.light1)
			console.log('hey dave color change-----');
			global.light1.connect();
			global.light1.startColorFlow([
				new FlowState(300, 2, 8987966, 100),
				new FlowState(300, 2, 3826054, 30),
			], StartFlowAction.LED_STAY, 11);
			global.light2.connect();
			global.light2.startColorFlow([
				new FlowState(300, 2, 8987966, 100),
				new FlowState(300, 2, 3826054, 30),
			], StartFlowAction.LED_STAY, 11);
			global.light3.connect();
			global.light3.startColorFlow([
				new FlowState(300, 2, 8987966, 100),
				new FlowState(300, 2, 3826054, 30),
			], StartFlowAction.LED_STAY, 11);
		},
		'seeing_red': function () {
			global.light1.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
			global.light2.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
			global.light3.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
		},
		'default': function () {
			console.log('NOT A COMMAND');
		}
	};
	if (commands[lightDisplay]) {
		return commands[lightDisplay]();
	} else {
		return commands.default;
	}

};

module.exports.initLights = function () {
	console.log('in init Lights');
	return new Promise(function (resolve, reject) {
		// discover.scanByIp().then(devices => startLights());
		//lights, command
		let setLights = new SetLights();

		discover.on('deviceAdded', (device) => {
			console.log('found device', device);
		});

		// let startLights = () => {
		//         console.log('STARTING LIGHTS');
		discover.start().then((devices) => {
			console.log(devices);
			
			//state, host, device, port
			devices.forEach(function (light, i) {
				let newLight = new RBGLight('init', light.host, light.port);
				setLights.lights.push(newLight);
				newLight.connectLight();
				// console.log(setLights.getLights());
			});

			if (global.light1) {}

		}).catch((e) => {
			console.log(e);
			discover.destroy();
			reject(e);
		});
		//}
	});
};