// /js/app.js
import { supabase, signIn, signOut, onAuthChange, ensureProfile, getUser } from './supabase.js';
import { initData, currentMode, loadBooks, addBook, updateBook, deleteBook, syncLocalToCloud, exportJSON, importJSON, randomId } from './data.js';

console.log("FF app.js loaded");

const $ = (sel, root=document) => root.querySelector(sel);

let shelvesEl;
// Controls
let searchEl, filterEl, sortEl, exportBtn, importInput, loadDemoBtn;
// Auth
let signinForm, emailInput, signedIn, whoEl, signOutBtn;
// Add form
let addForm;

let books = [];

// Wait until the HTML is parsed
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function init(){
  // Bind DOM elements now that the page is loaded
  shelvesEl   = $('#shelves');
  searchEl    = $('#search');
  filterEl    = $('#filterType');
  sortEl      = $('#sortBy');
  exportBtn   = $('#exportBtn');
  importInput = $('#importInput');
  loadDemoBtn = $('#loadDemo');

  signinForm  = $('#signinForm');
  emailInput  = $('#email');
  signedIn    = $('#signedIn');
  whoEl       = $('#who');
  signOutBtn  = $('#signOut');

  addForm     = $('#addForm');

  await initData();
  await refreshBooks();
  setupEvents();

  onAuthChange(async (user)=>{
    if(user){
      await ensureProfile();
      await initData();
      const moved = await syncLocalToCloud();
      if(moved.moved) alert(`Imported ${moved.moved} book(s) from this device into your account.`);
      await refreshBooks();
    } else {
      await initData();
      await refreshBooks();
    }
  });
}

function setupEvents(){
  searchEl.addEventListener('input', render);
  filterEl.addEventListener('change', render);
  sortEl.addEventListener('change', render);

  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([exportJSON(books)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='floozys-flyleafs.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  });

  importInput.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return; const text = await file.text();
    try{
      const count = await importJSON(text);
      alert(`Imported ${count} book(s).`);
      await refreshBooks();
    }catch(err){ alert('Import failed: ' + err.message); }
    e.target.value='';
  });

  loadDemoBtn.addEventListener('click', async ()=>{
    if(!confirm('Load a small demo set?')) return;
    const demo = demoBooks();
    if(currentMode()==='guest'){
      localStorage.setItem('ff_books_v1', JSON.stringify(demo.map(d=>({ ...d }))));
      await refreshBooks();
    } else {
      for(const b of demo){ await addBook({ ...b, id: undefined }); }
      await refreshBooks();
    }
  });

  signinForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = emailInput.value.trim(); if(!email) return;
    try{ await signIn(email); alert('Check your email for a magic link to sign in.'); }
    catch(err){ alert(err.message); }
  });

  signOutBtn.addEventListener('click', async ()=>{ await signOut(); });

  // Add form submit
  addForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(addForm);
    const book = {
      id: randomId(),
      title: (fd.get('title')||'').toString().trim(),
      author: (fd.get('author')||'').toString().trim(),
      type: (fd.get('type')||'fiction').toString(),
      rating: Number(fd.get('rating'))||0,
      dateRead: (fd.get('dateRead')||'').toString(),
      cover: (fd.get('cover')||'').toString().trim(),
      note: (fd.get('note')||'').toString().trim(),
      facing: (fd.get('cover')||'').toString().trim() ? 'cover' : 'spine'
    };
    if(!book.title || !book.author){ alert('Please enter both title and author.'); return; }
    await addBook(book);
    addForm.reset();
    await refreshBooks();
  });
}

async function refreshBooks(){
  books = await loadBooks();
  await refreshAuthUI();
  render();
}

async function refreshAuthUI(){
  const user = await getUser();
  if(user){
    signinForm.hidden = true;
    signedIn.hidden = false;
    whoEl.textContent = user.email;
  } else {
    signinForm.hidden = false;
    signedIn.hidden = true;
  }
}

function render(){
  const q = normalize(searchEl.value);
  const type = filterEl.value;
  const sortBy = sortEl.value;

  let list = books.filter(b => {
    const matchesQ = !q || normalize(b.title).includes(q) || normalize(b.author).includes(q);
    const matchesType = type==='all' || b.type===type;
    return matchesQ && matchesType;
  });

  list.sort((a,b)=>{
    if(sortBy==='author') return normalize(a.author).localeCompare(normalize(b.author)) || normalize(a.title).localeCompare(normalize(b.title));
    if(sortBy==='title') return normalize(a.title).localeCompare(normalize(b.title));
    if(sortBy==='dateRead') return (b.dateRead||'').localeCompare(a.dateRead||'');
    if(sortBy==='rating') return (b.rating||0) - (a.rating||0);
    return 0;
  });
  if(sortBy==='rating') list.reverse();

  shelvesEl.innerHTML = '';
const perShelf = window.innerWidth < 720 ? 8 : 16;
  for(let i=0;i<list.length;i+=perShelf){
    const shelfBooks = list.slice(i, i+perShelf);
    const shelf = document.createElement('section'); shelf.className='shelf';
    const label = document.createElement('div'); label.className='shelf-label'; label.textContent=`Shelf ${Math.floor(i/perShelf)+1}`; shelf.appendChild(label);
    const row = document.createElement('div'); row.className='books'; shelf.appendChild(row);
    shelfBooks.forEach((b, j) => row.appendChild(renderBook(b, j)));
    shelvesEl.appendChild(shelf);
  }
  if(list.length===0){ shelvesEl.innerHTML = '<p class="muted" style="padding:12px">No books yet. Add your first one above! 💫</p>'; }
}

function renderBook(b, j=0){
  const wrap = document.createElement('div'); wrap.className='book'; wrap.dataset.id=b.id;

  if(b.facing==='cover' && (b.cover||'').trim()!=='' ){
    const cover = document.createElement('div'); cover.className='cover'; cover.title='Click to flip'; cover.addEventListener('click', ()=>flip(b.id));
    const img = document.createElement('img'); img.src=b.cover; img.alt=b.title; img.onerror = ()=>{ cover.innerHTML=''; cover.appendChild(placeholder()); };
    cover.appendChild(img);
    const hint = document.createElement('div'); hint.className='flip-hint'; hint.textContent='flip'; cover.appendChild(hint);
    wrap.appendChild(cover);

    // index card (only when face-out)
    const note = document.createElement('div');
    note.className = 'note' + ((b.note||'').trim() ? '' : ' empty');
    note.textContent = (b.note||'').trim() ? b.note : 'add a note';
    // click card to edit (no icons)
    note.addEventListener('click', async ()=>{
      const next = prompt(`Note for "${b.title}"`, (b.note||''));
      if(next===null) return;
      await updateBook(b.id, { note: next.trim() });
      await refreshBooks();
    });
    wrap.appendChild(note);

  } else {
    // SPINE MODE
    const spine = document.createElement('div');
    spine.className = 'spine';
    spine.title = 'Click to flip';

    // cover art texture if available
    if ((b.cover || '').trim() !== '') {
      spine.classList.add('spine-img');
      spine.style.backgroundImage = `url(${b.cover})`;
    } else {
      spine.style.background = hashToColor(b.title + b.author);
    }

    // varied fonts for readability
    const fontClass = 'font-f' + (Math.abs(hash(b.title + b.author)) % 5 + 1);
    const label = document.createElement('div'); label.className='label ' + fontClass;
    label.innerHTML = `<div>${escapeHTML(b.title)}</div><div class="author">${escapeHTML(b.author)}</div>`;
    spine.appendChild(label);

    // subtle lean left/right
    spine.classList.add(j % 2 === 0 ? 'lean-left' : 'lean-right');

    const hint = document.createElement('div'); hint.className='flip-hint'; hint.textContent='flip';
    spine.appendChild(hint);

    spine.addEventListener('click', ()=>flip(b.id));
    wrap.appendChild(spine);
  }

  return wrap;
}


function placeholder(){
  const ph = document.createElement('div'); ph.className='placeholder';
  const bg = hashToColor(Math.random().toString());
  ph.style.background = `linear-gradient(135deg, ${bg}, #333)`;
  ph.style.color = '#fff';
  ph.textContent = 'No Cover';
  return ph;
}

async function flip(id){
  const b = books.find(x=>x.id===id); if(!b) return;
  const next = (b.facing==='cover') ? 'spine' : 'cover';
  await updateBook(id, { facing: next });
  await refreshBooks();
}

async function editNote(id){
  const b = books.find(x=>x.id===id); if(!b) return;
  const next = prompt(`Edit note for "${b.title}"`, b.note||'');
  if(next===null) return; await updateBook(id, { note: next.trim() }); await refreshBooks();
}

async function del(id){
  if(!confirm('Delete this book?')) return; await deleteBook(id); await refreshBooks();
}

// ---------- Helpers ----------
function normalize(str){ return (str||'').toLowerCase(); }
function stars(n){ return '★'.repeat(n||0) + '☆'.repeat(Math.max(0,5-(n||0))); }
function escapeHTML(str=''){ return str.replace(/[&<>\"]/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[s])); }
function hashToColor(str){ let h=0; for(let i=0;i<str.length;i++){ h=(h<<5)-h+str.charCodeAt(i); h|=0; } const hue=Math.abs(h)%360; return `hsl(${hue} 55% 45%)`; }
function hash(str){ let h=0; for(let i=0;i<str.length;i++){ h=(h<<5)-h+str.charCodeAt(i); h|=0; } return h; }

function demoBooks(){
  return [
    { id:'b_1', title:'Pride and Prejudice', author:'Jane Austen', type:'fiction', rating:5, dateRead:'2023-06-12', cover:'https://covers.openlibrary.org/b/id/8091012-L.jpg', note:'Witty, romantic, and sharper than I remembered.', facing:'cover' },
    { id:'b_2', title:'Thinking, Fast and Slow', author:'Daniel Kahneman', type:'nonfiction', rating:4, dateRead:'2022-11-02', cover:'https://covers.openlibrary.org/b/id/6917225-L.jpg', note:'Changed how I interpret my own brain glitches.', facing:'cover' },
    { id:'b_3', title:'The Goldfinch', author:'Donna Tartt', type:'fiction', rating:5, dateRead:'2021-03-20', cover:'', note:'Atmosphere for days. Hangs in your mind like museum air.', facing:'spine' },
    { id:'b_4', title:'Atomic Habits', author:'James Clear', type:'nonfiction', rating:4, dateRead:'2020-09-13', cover:'https://covers.openlibrary.org/b/id/9250116-L.jpg', note:'Tiny steps → compounding results. Actually useful.', facing:'cover' },
    { id:'b_5', title:'Circe', author:'Madeline Miller', type:'fiction', rating:5, dateRead:'2019-07-08', cover:'', note:'Fierce, magical, woman-forward retelling that sings.', facing:'spine' },
    { id:'b_6', title:'Educated', author:'Tara Westover', type:'nonfiction', rating:5, dateRead:'2018-01-28', cover:'https://covers.openlibrary.org/b/id/8406781-L.jpg', note:'Jaw-dropping resilience; could not put it down.', facing:'cover' },
  ];
}
