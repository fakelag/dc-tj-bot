import * as discord from 'discord.js';
import * as schedule from 'node-schedule';
import * as pokemon from './pokemon';

const bot = new discord.Client();

bot.on('error', console.error);
process.on('unhandledRejection', console.log);

const trackArrivals = {
	'1/20': 347,
};

const config = {
	arrivals: trackArrivals,
	motd: `Updating TJ for ${Object.keys(trackArrivals).join(', ')}`,
	targetChannel: 'tänään-jäljellä',
};

const beginDateTable = {
	'1/16': new Date("2016-01-04"),
	'2/16': new Date("2016-07-04"),
	'1/17': new Date("2017-01-02"),
	'2/17': new Date("2017-07-03"),
	'1/18': new Date("2018-01-08"),
	'2/18': new Date("2018-07-09"),
	'1/19': new Date("2019-01-07"),
	'2/19': new Date("2019-07-08"),
	'1/20': new Date("2020-01-06"),
	'2/20': new Date("2020-07-06"),
	'1/21': new Date("2021-01-04"),
	'2/21': new Date("2021-07-05"),
};

if (process.platform === 'win32') {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => {
		process.emit('SIGINT');
	});
}

['SIGINT', 'SIGTERM'].forEach((sig) => {
	process.on(sig, () => {
		process.exit();
	});
});

const dateDiffDays = (d1, d2) => {
	if (d2.getYear() == d1.getYear() && d2.getMonth() == d1.getMonth() && d2.getDate() == d1.getDate())
		return 0;

	if (d2.getTime() > d1.getTime()) {
		d1.setHours(6);
		d2.setHours(3);
	} else {
		d1.setHours(3);
		d2.setHours(6);
	}

	const timeDiff = Math.abs(d2.getTime() - d1.getTime());
	const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
	return diffDays;
}

const calcTJDays = (arrival, totalDays = 347) => {
	try {
		if (beginDateTable[arrival] === undefined)
			return -1;

		const curDate = new Date();
		curDate.setHours(0);
		curDate.setMinutes(0);
		curDate.setSeconds(0);

		const beginDate = beginDateTable[arrival];
		beginDate.setHours(0);
		beginDate.setMinutes(0);
		beginDate.setSeconds(0);

		if (Date.now() < beginDate.getTime())
			return { hasBegun: false, tj: dateDiffDays(curDate, beginDate) };

		const endDate = new Date(beginDate);
		endDate.setDate(endDate.getDate() + (totalDays - 1));

		return { hasBegun: true, tj: dateDiffDays(curDate, endDate) };
	} catch (err) {
		console.error(err);
		return { hasBegun: true, tj: -1 };
	}
}

const showTJ = () => {
	try {
		const channel = bot.channels.find((chan) => chan.name === config.targetChannel);

		if (channel) {
			Object.entries(config.arrivals).forEach(([arrivalName, totalDays]) => {
				const tjObject = calcTJDays(arrivalName, totalDays);

				if (tjObject.tj === -1)
					return;

				if (tjObject.hasBegun) {
					channel.send(`${arrivalName} (${totalDays}) Tänään jäljellä enää ${tjObject.tj} päivää.`);
					if (pokemon.isValidIndex(tjObject.tj - 1)) {
						const pokemonName = pokemon.getPokemonName(tjObject.tj - 1);

						let pokemonEmbed = new discord.RichEmbed()
							.setTitle(`(${arrivalName}) Päivän pokemon: ${pokemonName}`)
							.setImage(pokemon.getPokemonImageUrl(tjObject.tj));

						channel.send(pokemonEmbed);
					}
				} else {
					channel.send(`${arrivalName} Palveluksen alkuun ${tjObject.tj} päivää.`);
				}
			});
		} else {
			console.error(`Unable to access target channel "${config.targetChannel}"`);
		}
	} catch (err) {
		console.error(err);
	}
};

bot.on('ready', () => {
	console.log('TJ Bot Ready!');
	bot.user.setPresence({ game: { name: config.motd }, status: 'online' });

	showTJ();
});

schedule.scheduleJob('0 0 12 * * *', showTJ);

bot.login(process.env.DISCORD_TOKEN);
