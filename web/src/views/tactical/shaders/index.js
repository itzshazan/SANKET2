import { thermalShader } from './thermal.js';
import { nightVisionShader } from './surveillance.js';
import { retroShader } from './retro.js';
import { noirShader } from './noir.js';
import { snowShader } from './snow.js';
import { animeShader } from './anime.js';

export const TACTICAL_SHADERS = {
  normal: null,
  thermal: thermalShader,
  surveillance: nightVisionShader,
  retro: retroShader,
  noir: noirShader,
  snow: snowShader,
  anime: animeShader,
};

export { thermalShader, nightVisionShader, retroShader, noirShader, snowShader, animeShader };
