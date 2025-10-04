
const API = {
  services: 'data/services.json',
  users: 'data/users.json'
};
const KEY_S = 'tcs_services_override';
const KEY_ADMIN = 'tcs_admin';

const COP = n => Number(n).toLocaleString('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0});

async function loadJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('No se pudo cargar ' + url);
  return await res.json();
}

// Carga servicios: usa override en localStorage si existe
async function getServices(){
  const override = localStorage.getItem(KEY_S);
  if(override){ try { return JSON.parse(override); } catch(_){} }
  return await loadJSON(API.services);
}

function setServices(arr){
  localStorage.setItem(KEY_S, JSON.stringify(arr));
}

// Navbar active link
function setActive(navId){
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.remove('active'));
  const el = document.getElementById(navId); if(el) el.classList.add('active');
}

// Render grid de servicios en servicios.html
async function renderCatalog(){
  const container = document.getElementById('catalog-grid');
  if(!container) return;
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  let list = await getServices();

  function draw(){
    const text = (q?.value || '').toLowerCase().trim();
    let arr = list.filter(s => s.nombre.toLowerCase().includes(text));
    if(sort){
      if(sort.value==='name-asc') arr.sort((a,b)=>a.nombre.localeCompare(b.nombre));
      if(sort.value==='price-asc') arr.sort((a,b)=>a.precio-b.precio);
      if(sort.value==='price-desc') arr.sort((a,b)=>b.precio-a.precio);
    }
    container.innerHTML = arr.map(s => `
      <div class="col">
        <div class="card card-glass service-card h-100">
          <img class="cover w-100" src="assets/img/${s.icon}" alt="${s.nombre}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h5 class="card-title">${s.nombre}</h5>
              ${s.promo?'<span class="badge badge-promo rounded-pill">PROMO</span>':''}
            </div>
            <p class="card-text text-secondary">${s.descripcion}</p>
            <div class="d-flex justify-content-between align-items-center">
              <div class="fw-bold">${COP(s.precio)}</div>
              <a class="btn btn-sm btn-outline-info" href="detalle.html?id=${s.id}">Ver más</a>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  q && q.addEventListener('input', draw);
  sort && sort.addEventListener('change', draw);
  draw();
}

// Render detalle en detalle.html
async function renderDetail(){
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id'));
  const view = document.getElementById('detail');
  if(!view) return;
  const list = await getServices();
  const s = list.find(x=>x.id===id) || list[0];
  view.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6">
        <img class="w-100 rounded-4 border" src="assets/img/${s.icon}" alt="${s.nombre}">
      </div>
      <div class="col-md-6">
        <h2>${s.nombre}</h2>
        <div class="h4 text-info">${COP(s.precio)}</div>
        <p class="text-secondary">${s.descripcion}</p>
        <div class="d-flex gap-2 my-2">
          <span class="badge bg-secondary">Cantidad: ${s.cantidad}</span>
          <span class="badge ${s.promo?'badge-promo':''}">${s.promo?'En promoción':'Precio regular'}</span>
        </div>
        <button class="btn btn-glow">Contratar servicio</button>
      </div>
    </div>`;
}

// Admin: login + CRUD
async function renderAdmin(){
  const section = document.getElementById('admin');
  if(!section) return;

  // Estado de sesión
  const session = JSON.parse(localStorage.getItem(KEY_ADMIN) || 'null');
  const formLogin = document.getElementById('form-login');
  const boxPanel = document.getElementById('panel');
  const who = document.getElementById('whoami');

  function showLogin(){ formLogin.classList.remove('d-none'); boxPanel.classList.add('d-none'); }
  function showPanel(){ formLogin.classList.add('d-none'); boxPanel.classList.remove('d-none'); }

  if(session){ who.textContent = `${session.nombre} (${session.email})`; showPanel(); }
  else { showLogin(); }

  document.getElementById('btn-login').addEventListener('click', async ()=>{
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    const users = await loadJSON(API.users);
    const ok = users.find(u=>u.email===email && u.pass===pass);
    if(ok){
      localStorage.setItem(KEY_ADMIN, JSON.stringify(ok));
      who.textContent = `${ok.nombre} (${ok.email})`;
      showPanel(); fillTable();
    }else{
      alert('Credenciales inválidas');
    }
  });
  document.getElementById('btn-logout').addEventListener('click', ()=>{
    localStorage.removeItem(KEY_ADMIN); showLogin();
  });

  // CRUD
  function formToObj(){
    return {
      id: Number(document.getElementById('id').value || 0),
      nombre: document.getElementById('nombre').value.trim(),
      precio: Number(document.getElementById('precio').value),
      cantidad: Number(document.getElementById('cantidad').value),
      promo: document.getElementById('promo').value === 'true',
      descripcion: document.getElementById('descripcion').value.trim(),
      icon: document.getElementById('icon').value.trim() || 'maint.svg'
    };
  }
  function objToForm(s){
    document.getElementById('id').value = s.id;
    document.getElementById('nombre').value = s.nombre;
    document.getElementById('precio').value = s.precio;
    document.getElementById('cantidad').value = s.cantidad;
    document.getElementById('promo').value = String(s.promo);
    document.getElementById('descripcion').value = s.descripcion;
    document.getElementById('icon').value = s.icon;
  }
  async function fillTable(){
    const tbody = document.querySelector('#table tbody');
    const list = await getServices();
  
    tbody.innerHTML = list.map(s=>`
      <tr>
        <td>${s.nombre}</td>
        <td>${COP(s.precio)}</td>
        <td>${s.cantidad}</td>
        <td>${s.promo
          ? '<span class="badge bg-success">Sí</span>'
          : '<span class="badge bg-secondary">No</span>'}
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info me-1 d-inline-flex align-items-center gap-1" 
                  data-id="${s.id}" data-action="edit">
            <i class="ri-edit-2-line"></i> Editar
          </button>
          <button class="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1" 
                  data-id="${s.id}" data-action="del">
            <i class="ri-delete-bin-line"></i> Eliminar
          </button>
        </td>
      </tr>`).join('');
  
  }

  document.getElementById('table').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    let list = await getServices();
    if(action==='edit'){
      const s = list.find(x=>x.id===id); if(s) objToForm(s);
    }else if(action==='del'){
      if(confirm('¿Eliminar este servicio?')){
        list = list.filter(x=>x.id!==id); setServices(list); fillTable(); alert('Eliminado');
      }
    }
  });

  document.getElementById('btn-save').addEventListener('click', async ()=>{
    const s = formToObj();
    let list = await getServices();
    if(!s.id){ s.id = Math.max(0, ...list.map(x=>x.id))+1; list.push(s); }
    else {
      const i = list.findIndex(x=>x.id===s.id);
      if(i>-1) list[i]=s; else list.push(s);
    }
    setServices(list); await fillTable(); alert('Guardado ✅'); document.getElementById('form-service').reset();
  });

  document.getElementById('btn-clear').addEventListener('click', ()=>{
    document.getElementById('form-service').reset();
    document.getElementById('id').value='';
  });

  document.getElementById('btn-seed').addEventListener('click', async ()=>{
    localStorage.removeItem(KEY_S); await fillTable(); alert('Datos restaurados');
  });

  fillTable();
}

// Init por página
document.addEventListener('DOMContentLoaded', ()=>{
  renderCatalog();
  renderDetail();
  renderAdmin();
  AOS?.init?.();
});
