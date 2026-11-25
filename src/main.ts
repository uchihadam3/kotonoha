import './ui/ui.css';
import { App } from './game/app';

const params = new URLSearchParams(location.search);
const app = new App(document.getElementById('app')!, params);
void app.boot();
(window as unknown as { kt: App }).kt = app;
