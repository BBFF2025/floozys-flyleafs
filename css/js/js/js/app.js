// /js/app.js
note.appendChild(tools); note.appendChild(starsEl); note.appendChild(text);


const meta = document.createElement('div'); meta.className='tiny muted';
const when = b.dateRead ? new Date(b.dateRead).toLocaleDateString() : '—';
meta.textContent = `${b.author} • Read: ${when}`;


wrap.appendChild(note); wrap.appendChild(meta);
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


// ---------- Helpers ----------
function normalize(str){ return (str||'').toLowerCase(); }
function stars(n){ return '★'.repeat(n||0) + '☆'.repeat(Math.max(0,5-(n||0))); }
function escapeHTML(str=''){ return str.replace(/[&<>\"]/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[s])); }
function hashToColor(str){ let h=0; for(let i=0;i<str.length;i++){ h=(h<<5)-h+str.charCodeAt(i); h|=0; } const hue=Math.abs(h)%360; return `hsl(${hue} 55% 45%)`; }


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
