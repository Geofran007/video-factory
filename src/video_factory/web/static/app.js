// Interfaz de AI Video Factory. Todo el texto proveniente de la IA se inserta con textContent.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STAGES = { queued: 'En cola', content: 'Generando guion', audio: 'Sintetizando voz', timeline: 'Sincronizando',
    render: 'Renderizando escenas', mix: 'Mezclando audio', compose: 'Componiendo MP4', qa: 'Control de calidad', done: 'Terminado' };
  const STATUS = { queued: ['En cola', 'warn'], running: ['En proceso', 'warn'], done: ['Listo', 'ok'],
    qa_failed: ['QA con fallos', 'err'], failed: ['Error', 'err'] };
  let options = null;
  let polling = null;
  let currentJob = null;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmtDate = (iso) => new Date(iso).toLocaleString('es-419', { dateStyle: 'short', timeStyle: 'short' });
  const fileUrl = (id, name, dl) => `/api/jobs/${encodeURIComponent(id)}/files/${name}${dl ? '?download=true' : ''}`;

  async function api(path, opts) {
    const res = await fetch(path, opts);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || `Error ${res.status}`);
    return body;
  }

  function fillSelect(select, items, selected) {
    for (const it of items) {
      const o = el('option', null, it.label);
      o.value = it.value;
      if (it.value === selected) o.selected = true;
      select.appendChild(o);
    }
  }

  async function loadOptions() {
    options = await api('/api/options');
    const cats = options.categories.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }));
    fillSelect($('category'), cats, 'curiosidades');
    fillSelect($('style'), options.styles.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })));
    fillSelect($('voice'), options.voices.map((v) => ({ value: v.id, label: v.label })), options.voices[0]?.id);
    fillSelect($('example'), options.examples.map((e) => ({ value: e.name, label: `${e.title} (${e.category})` })));
    const d = $('duration');
    d.min = options.duration.min; d.max = options.duration.max; d.value = options.duration.default;
    $('duration-out').textContent = `${d.value} s`;
    $('speed').max = options.speed.max;
    $('meta').textContent = `Modelo: ${options.model} · Búsqueda web: ${options.web_search ? 'sí' : 'no'} · ` +
      `Gasto hoy: $${options.spent_today_usd.toFixed(3)} / $${options.daily_budget_usd.toFixed(2)}`;
    if (!options.ai_available) {
      $('hint').textContent = 'No hay ANTHROPIC_API_KEY configurada: solo puedes generar desde los ejemplos.';
      if (options.examples.length) $('example').value = options.examples[0].name;
    }
    syncForm();
  }

  function syncForm() {
    const usingExample = Boolean($('example').value);
    $('topic').disabled = usingExample;
    $('category').disabled = usingExample;
    $('duration').disabled = usingExample;
  }

  async function submit(ev) {
    ev.preventDefault();
    const payload = {
      topic: $('topic').value.trim(), category: $('category').value, duration_s: Number($('duration').value),
      style: $('style').value || null, voice: $('voice').value, speed: Number($('speed').value),
      example: $('example').value || null,
    };
    if (!payload.example && payload.topic.length < 3) { $('hint').textContent = 'Escribe una temática o elige un ejemplo.'; return; }
    $('submit').disabled = true;
    try {
      const { job_id } = await api('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      $('hint').textContent = '';
      watch(job_id);
      loadHistory();
    } catch (err) {
      $('hint').textContent = err.message;
      $('submit').disabled = false;
    }
  }

  function setStatus(job) {
    $('status').hidden = false;
    const pct = Math.round((job.progress || 0) * 100);
    $('status-stage').textContent = job.status === 'failed' ? 'Error' : (STAGES[job.stage] || job.stage);
    $('status-pct').textContent = `${pct} %`;
    $('status-bar').style.width = `${pct}%`;
    let msg = job.queue_position ? `Posición en cola: ${job.queue_position}` : '';
    if (job.error) msg = job.error;
    $('status-msg').textContent = msg;
  }

  function watch(jobId) {
    clearInterval(polling);
    currentJob = jobId;
    const tick = async () => {
      try {
        const job = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
        setStatus(job);
        if (['done', 'qa_failed', 'failed'].includes(job.status)) {
          clearInterval(polling);
          $('submit').disabled = false;
          showResult(job);
          loadHistory();
        }
      } catch (err) { $('status-msg').textContent = err.message; }
    };
    tick();
    polling = setInterval(tick, 1500);
  }

  function badge(text, kind) { return el('span', `badge ${kind}`, text); }

  function showResult(job) {
    $('result-empty').hidden = true;
    $('result').hidden = false;
    const meta = job.metadata || {};
    const content = job.content || {};
    $('r-title').textContent = job.title || content.title || job.topic;
    const badges = $('r-badges');
    badges.replaceChildren();
    const [label, kind] = STATUS[job.status] || [job.status, 'warn'];
    badges.appendChild(badge(label, kind));
    if (content.claims) badges.appendChild(job.needs_review ? badge('Requiere revisión de datos', 'warn') : badge('Datos verificados', 'ok'));
    badges.appendChild(badge(job.category, 'ok'));
    $('r-duration').textContent = job.duration_s ? `${job.duration_s.toFixed(1)} s` : '—';
    const checks = (job.report && job.report.checks) || [];
    const audioChecks = checks.filter((c) => /audio|narracion/.test(c.name));
    $('r-audio').textContent = audioChecks.length
      ? (audioChecks.every((c) => c.passed) ? 'Narración, música y efectos OK' : 'Revisar: ' + audioChecks.filter((c) => !c.passed).map((c) => c.detail).join('; '))
      : '—';
    $('r-cost').textContent = job.cost_usd ? `$${job.cost_usd.toFixed(4)}` : '$0 (sin llamadas a la IA)';
    $('r-path').textContent = job.output_dir;

    const video = $('video');
    if (job.files.includes('video.mp4')) {
      video.src = fileUrl(job.id, 'video.mp4');
      video.poster = job.files.includes('thumbnail.jpg') ? fileUrl(job.id, 'thumbnail.jpg') : '';
      video.hidden = false;
    } else { video.removeAttribute('src'); video.hidden = true; }

    const dl = $('r-downloads');
    dl.replaceChildren();
    const links = [['video.mp4', 'Descargar MP4', true], ['script.md', 'Guion'], ['metadata.json', 'Metadatos'],
      ['subtitles.srt', 'Subtítulos'], ['report.json', 'Reporte QA'], ['job.log', 'Log']];
    for (const [name, text, main] of links) {
      if (!job.files.includes(name)) continue;
      const a = el('a', main ? 'main' : '', text);
      a.href = fileUrl(job.id, name, true);
      dl.appendChild(a);
    }

    const scenes = $('r-scenes');
    scenes.replaceChildren();
    const times = Object.fromEntries((job.timeline_summary || []).map((s) => [s.id, s]));
    for (const s of content.scenes || []) {
      const li = el('li');
      const t = times[s.id];
      li.appendChild(el('div', 'tag', `${s.role} · ${s.type}${t ? ` · ${t.start.toFixed(1)}–${t.end.toFixed(1)} s` : ''}`));
      li.appendChild(el('div', null, s.narration));
      scenes.appendChild(li);
    }

    const claims = $('r-claims');
    claims.replaceChildren();
    for (const c of content.claims || []) {
      const li = el('li', null, `${c.status === 'verified' ? '✅' : '⚠️'} ${c.statement}`);
      if (c.review_note) li.appendChild(el('span', 'note', c.review_note));
      claims.appendChild(li);
    }
    if (!(content.claims || []).length) claims.appendChild(el('li', null, 'Sin afirmaciones registradas.'));

    $('r-description').value = meta.description || '';
    $('r-hashtags').textContent = (meta.hashtags || []).join(' ');

    const qa = $('r-qa');
    qa.replaceChildren();
    for (const c of checks) qa.appendChild(el('li', null, `${c.passed ? '✅' : '❌'} ${c.name} — ${c.detail}`));
    if (job.status === 'failed') qa.appendChild(el('li', null, `❌ ${job.error}`));
  }

  async function loadHistory() {
    const jobs = await api('/api/jobs');
    const body = $('history');
    body.replaceChildren();
    for (const j of jobs) {
      const tr = el('tr');
      const [label] = STATUS[j.status] || [j.status];
      tr.append(el('td', null, fmtDate(j.created_at)), el('td', 'topic', j.title || j.topic), el('td', null, label),
        el('td', null, j.duration_s ? `${j.duration_s.toFixed(1)} s` : '—'), el('td', null, `$${(j.cost_usd || 0).toFixed(4)}`),
        el('td', 'mono', j.output_dir));
      tr.addEventListener('click', () => {
        if (['queued', 'running'].includes(j.status)) watch(j.id);
        else api(`/api/jobs/${encodeURIComponent(j.id)}`).then(showResult);
      });
      body.appendChild(tr);
    }
    if (!jobs.length) {
      const tr = el('tr'); const td = el('td', null, 'Aún no hay videos generados.'); td.colSpan = 6; tr.appendChild(td); body.appendChild(tr);
    }
  }

  $('form').addEventListener('submit', submit);
  $('example').addEventListener('change', syncForm);
  $('refresh').addEventListener('click', loadHistory);
  $('duration').addEventListener('input', (e) => { $('duration-out').textContent = `${e.target.value} s`; });
  $('speed').addEventListener('input', (e) => { $('speed-out').textContent = `${Number(e.target.value).toFixed(2)}×`; });
  loadOptions().then(loadHistory).catch((err) => { $('meta').textContent = err.message; });
})();
