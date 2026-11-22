// Audio oscillators run continuously even when a background tab throttles JS timers.
export class ContinuousAlarm{
 constructor(){this.nodes=null;}
 sync(active,context,enabled,volume=.5){if(!active||!enabled||!context||volume<=0){this.stop();return;}if(this.nodes)return;const tone=context.createOscillator(),lfo=context.createOscillator(),sweep=context.createGain(),gain=context.createGain();tone.type='square';tone.frequency.value=740;lfo.type='square';lfo.frequency.value=2;sweep.gain.value=150;gain.gain.value=.18*Math.min(1,volume);lfo.connect(sweep);sweep.connect(tone.frequency);tone.connect(gain);gain.connect(context.destination);tone.start();lfo.start();this.nodes={tone,lfo,sweep,gain};}
 stop(){if(!this.nodes)return;for(const key of ['tone','lfo']){try{this.nodes[key].stop();}catch{}}for(const node of Object.values(this.nodes))try{node.disconnect();}catch{}this.nodes=null;}
}
