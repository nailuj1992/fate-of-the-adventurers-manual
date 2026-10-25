/*
 * adapter.js — Adaptador de la versión manual: el motor corre en esta página y el presentador confirma a mano.
 * ÚNICO archivo de la interfaz que difiere entre los repositorios fate-of-the-adventurers-twitch y fate-of-the-adventurers-manual.
 * Debe definir: ADAPTER (capacidades), api(nombre, cuerpo) → resultado del motor/servidor y boot() (arranca el flujo de estados).
 * Se carga después de ui/*.js y antes de ui/main.js.
 */
'use strict';
/* ---- Adaptador de la versión manual: el motor (core.js) corre en esta página; el presentador confirma a mano ---- */
// Capacidades que el código compartido (ui/*.js) consulta en lugar de preguntar «qué versión soy»:
//   twitchNames: los nombres de la lista son usuarios de Twitch (formato validado, «@» inicial ignorado y conexión obligatoria).
//   helpSuffix: sufijo de la variante del texto de ayuda de la configuración (cfg.help.<k><sufijo>), si existe.
const ADAPTER = { name: 'manual', twitchNames: false, helpSuffix: '_manual' };
document.body.classList.add('manual');
const CFG_KEY = 'celestiales.config.v1', STATE_KEY = 'celestiales.state.v1';      // localStorage: solo configuración y estado del evento (nunca credenciales)
let savedConfig = { ...Core.DEFAULT_CONFIG };
try { const r = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); if (r) savedConfig = Core.validateConfig(r).config; } catch(e){}
const engine = new Core.Engine({ onChange: () => publish() });
function publish(){
  const v = engine.view();
  Object.assign(v, { twitch:{ configured:true, authenticated:true, status:'connected', channel:'', user:'', reason:null },
                     config: savedConfig, defaults: Core.DEFAULT_CONFIG, limits: Core.LIMITS });
  setState(v);
  try {                                                  // sobrevivir a un F5: se guarda el estado con su hora límite absoluta
    if (engine.screen === 'admin') localStorage.removeItem(STATE_KEY); else localStorage.setItem(STATE_KEY, JSON.stringify(engine.snapshot()));
  } catch(e){}
}
function saveCfg(cfg){ savedConfig = cfg; try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch(e){} }
const fail = (code, extra = {}) => ({ ok:false, errorKey:'err.' + code, errorParams:{}, ...extra });
async function api(name, body){
  let r;
  switch (name){
    case 'confirm': r = engine.confirmManual(); break;
    case 'pause': r = engine.pauseToggle(); break;
    case 'skip': r = engine.skip(); break;
    case 'disqualify': r = engine.disqualify(body.reason); break;
    case 'cancel': r = engine.cancel(); break;
    case 'reset': r = engine.reset(); break;
    case 'back': r = engine.back(); break;
    case 'config': {
      if (engine.screen !== 'admin') { r = fail('config_locked'); break; }
      const v = Core.validateConfig(body.config);
      if (!v.ok) { r = fail('config_invalid', { errors:v.errors }); break; }
      saveCfg(v.config); r = { ok:true }; publish(); break;
    }
    case 'start': {
      const v = Core.validateConfig(body.config, body.names.length);
      if (!v.ok) { r = fail('config_invalid', { errors:v.errors }); break; }
      saveCfg(v.config);
      r = engine.start(body.names.map(n => ({ name:n, key:normKey(n) })), v.config); break;
    }
    default: r = fail('generic');
  }
  if (!r.ok) toast(errText(r));
  return r;
}
function boot(){
  try {
    const snap = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (snap && engine.restore(snap)) { toast(t('toast.restored')); return; }
  } catch(e){}
  publish();
}
