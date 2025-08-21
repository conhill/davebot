export { getCommandType };
// import search from 'youtube-search';

const BANNED_URLS = ['https://www.youtube.com/watch?v=UOxkGD8qRB4', 'https://www.youtube.com/watch?v=XbGs_qK2PQA'];
let dropifyThis = false;

// Helper: Determine command type from message
function getCommandType(message) {
    if (!message || !message.content) return 'default';
    const msg = message.content.toLowerCase();
    if (msg === '!dave') return 'generic';
    if (msg === '!dave mtg') return 'mtg';
    if (msg === '!dave help') return 'help';
    if (msg === '!dave stats' && message.author && message.author.username === 'Dnoop') return 'stats';
    if (msg.includes('straight up')) return 'straight_up';
    if (msg.includes("it's your boy")) return 'its_your_boy';
    if (msg.includes("it's the rock")) return 'its_the_rock';
    if (msg.startsWith('hey dave') || msg.startsWith('hey gave')) return 'hey_dave';
    if (msg.includes(' oof')) return 'oof';
    if (msg.includes(process.env.SECRETCOMMAND)) return 'poppy_r';
    if (msg.includes('seeing red')) return 'seeing_red';
    if (msg.includes('dave play') && msg !== 'dave play') return 'dave_play';
    if (msg.includes('hey dave drop this one')) return 'drop';
    if (msg.includes('hey dave turn on streaming mode')) return 'stream_on';
    if (msg.includes('hey dave turn off streaming mode')) return 'stream_off';
    if (msg === global.wordOfTheDay) return 'word_of_the_day';
    return 'default';
}


async function handleCommand(command, searchTerm = false) {
    let audio;
    const { mtgResponse } = await import('../modals/mtgResponse/mtg_response.js');
    const commands = {
        'mtg': (message) => {
            // Call the MTG response handler
            return mtgResponse(message);
        },
        'straight_up': () => {
            audio = './sound/straightup.mp3';
            global.pQueue.enqueue({ url: audio, start: '0s' }, 1);
        },
        'its_your_boy': () => {
            audio = './sound/itsyaboy.mp3';
            global.pQueue.enqueue({ url: audio, start: '0s' }, 1);
        },
        'its_the_rock': () => {
            audio = './sound/itstherock.mp3';
            global.pQueue.enqueue({ url: audio, start: '0s' }, 1);
        },
        'hey_dave': () => {
            audio = './sound/icecubes.mp3';
            global.pQueue.enqueue({ url: audio, start: '0s' }, 1);
        },
        'oof': () => {
            audio = './sound/oof.mp3';
            global.pQueue.enqueue({ url: audio, start: '0s' }, 1);
        },
        'poppy_r': () => {
            audio = 'https://www.youtube.com/watch?v=79hRMiSMxFY';
            global.pQueue.enqueue({ url: audio, start: '0s' }, 1);
        },
        'drop': () => {
            dropifyThis = true;
        },
        'stream_on': () => {
            global.streaming = true;
        },
        'stream_off': () => {
            global.streaming = false;
        },
        'dave_play': (searchTerm) => {
            let opts = {
                maxResults: 10,
                key: process.env.YOUTUBEKEY,
                type: 'video'
            };
            // search(searchTerm, opts, function(err, results) {
            //     if (err) { return console.log(err); }
            //     if (!results || !results[0]) return;
            //     if (!BANNED_URLS.includes(results[0].link)) {
            //         global.pQueue.enqueue({ url: results[0].link, start: '0s', length: 30 }, 1);
            //     }
            // });
        },
        'seeing_red': () => {
            if (global.light1 && global.light2 && global.light3) {
                global.light1.connect().then((l) => {
                    l.setRGB({ r: 123, g: 99, b: 65 }, 'smooth', 5000);
                });
                global.light2.connect().then((l) => {
                    l.setRGB({ r: 123, g: 99, b: 65 }, 'smooth', 5000);
                });
                global.light3.connect().then((l) => {
                    l.setRGB({ r: 123, g: 99, b: 65 }, 'smooth', 5000);
                });
            }
        },
        'word_of_the_day': () => {
            console.log('YOU SAID THE WORD OF THE DAY');
        },
        'default': () => {
            console.log('NOT A COMMAND');
        }
    };
    if (commands[command]) {
        // For mtg, pass the message object
        if (command === 'mtg' && searchTerm && searchTerm.content) {
            return commands[command](searchTerm);
        }
        return searchTerm ? commands[command](searchTerm) : commands[command]();
    } else {
        return commands.default();
    }
}

export { handleCommand };
