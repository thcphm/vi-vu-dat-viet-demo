/* Unlock the engine mix on a browser-authorized user gesture. */
(() => {
  'use strict';
  let sound,engineRpm=760;
  const preference='taylai.audio.muted';
  let enabled = true;
  try { enabled=localStorage.getItem(preference)!=='1'; } catch {}
  function setupMusic() {
    const button = document.getElementById('carMusic');
    if (!button) return;
    const track = document.getElementById('cabinTrack');
    const label = button.querySelector('.musicLabel');
    track.volume = .48;
    // CC0 playlist. Credits are in edition/licenses/cabin-music.txt.
    const playlist = [
      ['silver-lining', 'Silver Lining'],
      ['vintage-hawaii', 'Vintage Hawaii']
    ];
    let current = -1;
    function cue(step) {
      current = (current + step + playlist.length) % playlist.length;
      track.src = 'music/' + playlist[current][0] + '.mp3';
      const callout = document.getElementById('callout');
      if (callout) callout.textContent = '♫ ' + playlist[current][1];
    }
    let selected = false;
    let driving = false;
    let playRequest = 0;

    function sync() {
      button.hidden = !driving;
      button.disabled = !enabled;
      button.setAttribute('aria-pressed', String(selected));
      label.textContent = selected ? 'Tắt nhạc' : 'Bật nhạc';
      button.title = !enabled ? 'Bật âm thanh để nghe nhạc'
        : selected ? 'Tắt nhạc · ' + playlist[current][1] : 'Bật nhạc';
      const request = ++playRequest;
      if (!selected || !driving || !enabled || document.hidden) {
        track.pause();
        return;
      }
      track.play().catch(() => {
        if (request !== playRequest) return;
        selected = false;
        sync();
        document.getElementById('callout').textContent = 'Chưa phát được nhạc. Bấm Bật nhạc để thử lại.';
      });
    }

    button.addEventListener('click', () => {
      selected = !selected;
      // Each time the radio is switched on it moves to the next track.
      if (selected) cue(1);
      sync();
    });
    track.addEventListener('ended', () => {
      cue(1);
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => {
      selected = false;
      sync();
    });
    sync();
    return {
      sync,
      setDriving(value) {
        if (driving === value) return;
        driving = value;
        sync();
      }
    };
  }
  const music = setupMusic();

  let nextTick = 0;
  let lowTick = false;
  let boosting = false;
  let voiceLine;
  function stopVoice() {
    if (voiceLine) window.speechSynthesis?.cancel();
    voiceLine = null;
  }
  function broadcast(line, radio) {
    if (!enabled) return;
    stopVoice();
    if (radio) {
      tone(392,392,.15,.09,0,'triangle');
      tone(494,494,.17,.08,.16,'triangle');
      tone(587,587,.26,.07,.34,'triangle');
    } else {
      tone(1210,1030,.21,.06);
      tone(1450,1280,.18,.045,.19);
    }
    const speech=window.speechSynthesis;
    const voice=speech?.getVoices().find(v=>/^vi\b/i.test(v.lang));
    if (!voice) return;
    const utterance=new SpeechSynthesisUtterance(line);
    utterance.voice=voice; utterance.lang='vi-VN'; utterance.volume=radio ? .82 : .67;
    utterance.rate=radio ? .96 : 1.03;
    utterance.onend=utterance.onerror=()=>{if(voiceLine===utterance)voiceLine=null;};
    voiceLine=utterance; speech.speak(utterance);
  }

  function makeCabin(ctx) {
    const output = ctx.createGain();
    output.gain.value = 0;
    output.connect(ctx.destination);

    const engine = ctx.createOscillator();
    // An uneven four-cylinder exhaust pulse, muffled by the cabin.
    const exhaustWave = ctx.createPeriodicWave(
      new Float32Array(9),
      Float32Array.of(0, .8, .54, .28, .09, .15, .05, .04, .025)
    );
    engine.setPeriodicWave(exhaustWave);
    const intake = ctx.createBiquadFilter();
    intake.type = 'lowpass';
    intake.Q.value = .58;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engine.connect(intake).connect(engineGain).connect(output);
    engine.start();

    const road = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.8), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let roughness = 0;
    for (let i = 0; i < data.length; i++) {
      roughness = .82 * roughness + .18 * (Math.random() * 2 - 1);
      data[i] = roughness;
    }
    road.buffer = buffer;
    road.loop = true;
    const tire = ctx.createBiquadFilter();
    tire.type = 'bandpass';
    tire.Q.value = .6;
    const roadGain = ctx.createGain();
    roadGain.gain.value = 0;
    road.connect(tire).connect(roadGain).connect(output);
    const rush = ctx.createBiquadFilter();
    rush.type = 'highpass';
    rush.Q.value = .55;
    const rushGain = ctx.createGain();
    rushGain.gain.value = 0;
    road.connect(rush).connect(rushGain).connect(output);
    const scrub = ctx.createOscillator();
    scrub.type = 'triangle';
    const scrubGain = ctx.createGain();
    scrubGain.gain.value = 0;
    scrub.connect(scrubGain).connect(output);
    scrub.start();
    road.start();

    return { ctx, output, engine, exhaustWave, electric:false, engineGain, intake, roadGain, tire, rush, rushGain, scrub, scrubGain };
  }

  function tone(frequency, endFrequency, length, volume, offset = 0, shape = 'sine') {
    if (!enabled || sound?.ctx.state !== 'running') return;
    const { ctx, output } = sound;
    const start = ctx.currentTime + offset;
    const source = ctx.createOscillator();
    const envelope = ctx.createGain();
    source.type = shape;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(endFrequency, start + length);
    envelope.gain.setValueAtTime(.00001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .004);
    envelope.gain.exponentialRampToValueAtTime(.00001, start + length);
    source.connect(envelope).connect(output);
    source.start(start);
    source.stop(start + length + .01);
    source.onended = () => { source.disconnect(); envelope.disconnect(); };
  }

  function unlock() {
    if(!enabled)return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    try {
      if (!sound || sound.ctx.state === 'closed') sound = makeCabin(new Audio());
      const { ctx, output } = sound;
      if (enabled && ctx.state !== 'running') ctx.resume().catch(() => {});
      output.gain.setTargetAtTime(enabled ? .55 : 0, ctx.currentTime, .045);
    } catch {}
  }
  function toggle() {
    enabled=!enabled;
    if(!enabled)stopVoice();
    try{localStorage.setItem(preference,enabled?'0':'1');}catch{}
    if(enabled)unlock();else if(sound)sound.output.gain.setTargetAtTime(0,sound.ctx.currentTime,.025);
    music?.sync();
    return enabled;
  }
  for(const event of ['pointerdown','keydown','click'])window.addEventListener(event,()=>{
    if(enabled&&sound?.ctx.state!=='running')unlock();
  },{capture:true});

  function update({ speed, throttle, braking, signal, mode, boost=false, slip=0, offroad=false, electric=false }) {
    music?.setDriving(mode === 'driving');
    if(mode!=='driving'&&voiceLine)stopVoice();
    const driving = mode === 'driving';
    const velocity = Math.max(0, Math.min(190, speed || 0));
    const load = driving && throttle && !braking ? 1 : 0;
    const kmhPerThousandRpm = velocity < 19 ? 8.4 : velocity < 37 ? 14 : velocity < 58 ? 22 : 30;
    engineRpm = electric ? null : Math.max(760, velocity / kmhPerThousandRpm * 1000) + load * 260;
    if (!enabled || sound?.ctx.state !== 'running') return;
    const { ctx, engine, engineGain, intake, roadGain, tire, rush, rushGain, scrub, scrubGain } = sound;
    const now = ctx.currentTime;
    const onBoost = Boolean(driving && boost);
    const speedFraction = velocity / 190;
    const skid = driving && !offroad ? Math.max(0, Math.min(1, slip)) * Math.min(1, velocity / 24) : 0;
    if (onBoost && !boosting) tone(220, 790, .24, .042, 0, 'triangle');
    if (driving && boosting && !onBoost) tone(650, 110, .19, .037, 0, 'triangle');
    boosting = onBoost;
    rush.frequency.setTargetAtTime(onBoost ? 1450 : 450 + 700 * speedFraction, now, .11);
    rushGain.gain.setTargetAtTime(driving ? .61 * speedFraction ** 2 + (onBoost ? .94 : 0) : 0, now, .09);
    scrub.frequency.setTargetAtTime(520 + 315 * skid + Math.sin(now * 32) * 26, now, .04);
    scrubGain.gain.setTargetAtTime(skid ** 1.6 * .09, now, .05);
    if (sound.electric !== electric) {
      if (electric) engine.type = 'sine';
      else engine.setPeriodicWave(sound.exhaustWave);
      sound.electric = electric;
    }
    if (electric) {
      engine.frequency.setTargetAtTime(85 + velocity * 3.8, now, .12);
      intake.frequency.setTargetAtTime(1100, now, .12);
      engineGain.gain.setTargetAtTime(driving ? .034 * load + .014 * speedFraction : 0, now, .14);
    } else {
      engine.frequency.setTargetAtTime(engineRpm / 30 + Math.sin(now * 6.8) * .26, now, .12);
      intake.frequency.setTargetAtTime(145 + engineRpm * .067 + load * 145 + (onBoost ? 240 : 0), now, .12);
      engineGain.gain.setTargetAtTime(driving ? .068 + load * .038 : mode==='idling' ? .038 : 0, now, .14);
    }
    tire.frequency.setTargetAtTime(offroad ? 230 + velocity * 2 : 260 + velocity * 8, now, .16);
    roadGain.gain.setTargetAtTime(driving ? velocity / 170 + (braking ? velocity / 340 : 0) : 0, now, .16);
    if (!driving || !signal) {
      nextTick = 0;
      lowTick = false;
    } else if (now >= nextTick) {
      tone(lowTick ? 660 : 830, 260, .023, .085, 0, 'triangle');
      lowTick = !lowTick;
      nextTick = now + .43;
    }
  }

  function cue(correct) {
    if (correct) {
      tone(622, 622, .095, .078);
      tone(831, 831, .15, .06, .075);
    } else {
      tone(330, 294, .18, .072);
    }
  }
  function souvenir(motif) {
    if (['echo','shell','ridge'].includes(motif)) {
      for (const [delay,volume] of [[0,.1],[.25,.05],[.51,.025]]) tone(392,388,.38,volume,delay);
    } else if (['drop','sail','turtle','lotus'].includes(motif)) {
      tone(370,660,.13,.07); tone(490,780,.18,.06,.15); tone(660,880,.3,.05,.36);
    } else if (['ink','gear','arch'].includes(motif)) {
      tone(146,82,.09,.09,0,'triangle'); tone(440,440,.21,.045,.12,'triangle');
    } else {
      tone(523,523,.3,.065); tone(659,659,.37,.055,.15); tone(784,784,.5,.045,.29);
    }
  }
  async function ignition(electric=false) {
    unlock();
    if (!enabled || !sound) return;
    try { await sound.ctx.resume(); } catch { return; }
    if(electric){cue(true);return;}
    for (let i=0;i<4;i++) tone(48+i*3,32+i*5,.085,.12,i*.073,'triangle');
    tone(44,96,.20,.16,.27,'sawtooth');
    tone(92,36,.36,.13,.46,'triangle');
  }
  function impact(strength,type) {
    if (!enabled || sound?.ctx.state !== 'running') return;
    strength=Math.min(1,Math.max(0,strength||0));
    if(!strength)return;
    if(type!=='water')tone(94,28,.14+strength*.15,.07+strength*.37);
    if(type==='person')return;
    if((type==='vehicle'||type==='car')&&strength>.4){
      tone(117,63,.17,.025+strength*.065,.06,'triangle');
      tone(1830,1270,.055,.012+strength*.023,.11);
      tone(1260,940,.046,.008+strength*.018,.18);
    }
    const {ctx,output}=sound, source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    const duration=type==='water'?.28+strength*.40:.12+strength*.28;
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-5*i/samples.length);
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=type==='curb'?480:1500;filter.Q.value=.65;
    if(type==='water'){filter.type='lowpass';filter.frequency.setValueAtTime(3400,ctx.currentTime);filter.frequency.exponentialRampToValueAtTime(450,ctx.currentTime+duration);}
    gain.gain.value=.4+strength*.45;source.connect(filter).connect(gain).connect(output);source.start();
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  window.driveAudio = { toggle, update, cue, ignition, impact, broadcast, souvenir, get enabled(){return enabled;}, get engineRpm(){return engineRpm;} };
})();
