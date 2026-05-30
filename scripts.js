// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://xhtiquhbfvzvnntfptrh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_s3fntuQStrIFj_fZrp6DNQ_Uu94hsYV"; // Debe empezar con eyJhbGci...
//const SUPABASE_ANON_KEY = "PEGÁ_AQUÍ_TU_LLAVE_ANON_REAL_DE_SUPABASE"; // Debe empezar con eyJhbGci...
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// CONFIGURACIÓN DE CONTACTO (Tu número de WhatsApp)
const MI_NUMERO_WHATSAPP = "5493518572503";

// Variable global para el sorteo activo
let SORTEO_ACTIVO_ID = null;
let sorteosDisponibles = [];
const MULTIPLICADORES = {
    1: 1, 2: 1.5, 4: 2.5, 6: 3.5, 10: 4.5, 15: 7, 20: 9, 30: 12, 50: 15, 100: 25, 200: 30
};

// Función para convertir links de Google Drive a links de imagen directos
function obtenerUrlDirecta(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('drive.google.com')) {
        const fileId = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1];
        // Usamos el endpoint uc para visualización directa
        if (fileId) return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
}

function obtenerPrecioCalculado(chances) {
    const sorteo = sorteosDisponibles.find(s => String(s.id) === String(SORTEO_ACTIVO_ID));
    const base = sorteo ? sorteo.precio_base : 5000;
    const mult = MULTIPLICADORES[chances] || chances;
    return base * mult;
}

// Función para detectar si el artículo debe ser "un" o "una" según el premio
function determinarArticulo(titulo) {
    if (!titulo) return 'una';
    const t = titulo.toLowerCase().trim();
    // Palabras clave que suelen ser masculinas en el contexto de premios
    const masculinos = ['iphone', 'samsung', 'celular', 'reloj', 'smartwatch', 'viaje', 'televisor', 'smart', 'kit', 'par', 'set', 'combo', 'auto', 'vuelo', 'ipad', 'macbook'];
    const primeraPalabra = t.split(' ')[0];
    if (masculinos.includes(primeraPalabra)) return 'un';
    if (t.endsWith('o')) return t.includes('moto') ? 'una' : 'un';
    if (t.endsWith('a')) return 'una';
    return 'una'; // Por defecto femenino (ej: Hilux, RAM, Amarok, etc.)
}

// Cargar automáticamente el sorteo activo
async function cargarInfoPublica() {
    const container = document.getElementById('sorteosActivosContainer');
    if (!container) return;

    try {
        const ahoraISO = new Date().toISOString();
        
        // Consulta simplificada para evitar errores de relación (join) si no están configuradas
        const { data: sorteos, error } = await supabaseClient
            .from('sorteos')
            .select('*') 
            .eq('activo', true)
            .gt('fecha_sorteo', ahoraISO)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error de Supabase:", error.message);
            container.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Error de conexión: ${error.message}</p></div>`;
            return;
        }

        if (!sorteos || sorteos.length === 0) {
            container.innerHTML = '<div class="text-center py-20"><p class="text-slate-500 text-lg">Próximamente nuevos sorteos...</p></div>';
            return;
        }

        sorteosDisponibles = sorteos;
        SORTEO_ACTIVO_ID = sorteos[0].id;
        actualizarPreciosUI();

        container.innerHTML = sorteos.map(sorteo => {
        const urls = (sorteo.imagen_url || "").split(/[\n,]+/).map(u => obtenerUrlDirecta(u.trim())).filter(u => u);
        
        // Cálculo de números disponibles
        const totalNumeros = (sorteo.max_numero - sorteo.min_numero) + 1;
        // Si quitamos el count de la consulta principal, lo ideal es mostrar 
        // el total por ahora o hacer una consulta aparte para la disponibilidad
        const vendidos = 0; 
        const disponibles = totalNumeros - vendidos;
        const precioBase = (sorteo.precio_base || 5000).toLocaleString('es-AR');

        return `
            <div class="raffle-card text-center" id="sorteo-${sorteo.id}">
                <span class="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Sorteo Activo de Confianza
                </span>
                <h2 class="text-4xl md:text-6xl font-extrabold mt-6 tracking-tight">
                    Ganate ${determinarArticulo(sorteo.titulo)} <span class="text-gold">${sorteo.titulo}</span>
                </h2>
                <p class="text-slate-400 mt-4 text-lg md:text-xl max-w-2xl mx-auto">${sorteo.descripcion || ''}</p>
                
                <div class="mt-4 flex justify-center gap-4">
                    <span class="text-xs font-bold text-slate-500 uppercase">Disponibilidad:</span>
                    <span class="text-xs font-black ${disponibles < 100 ? 'text-red-500' : 'text-green-500'}">${disponibles} / ${totalNumeros} Números restantes</span>
                </div>
                <div class="mt-2 flex justify-center gap-4">
                    <span class="text-xs font-bold text-slate-500 uppercase">Precio:</span>
                    <span class="text-xs font-black text-amber-500">Desde $${precioBase}</span>
                </div>

                <!-- Galería Estilo Mercado Libre -->
                <div class="relative flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex items-center justify-center shadow-2xl overflow-hidden w-full h-80 md:h-[500px] mt-8 group max-w-4xl mx-auto">
                    <img src="${urls[0] || ''}" class="mainImgView w-full h-full object-contain transition-all duration-300">

                    ${urls.length > 1 ? `
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 max-h-[80%] overflow-y-auto pr-1 custom-scrollbar z-10">
                        ${urls.map((url, i) => `
                            <img src="${url}" class="thumb-img w-14 h-14 object-contain bg-slate-950/60 backdrop-blur-md rounded-lg border-2 ${i === 0 ? 'border-amber-500' : 'border-slate-800'} cursor-pointer hover:border-amber-500 transition shrink-0 p-1 shadow-lg" onclick="cambiarImagenPrincipal('${url}', this)">
                        `).join('')}
                    </div>
                    <div class="absolute bottom-4 left-4 right-4 flex md:hidden gap-2 overflow-x-auto pb-1 custom-scrollbar z-10">
                        ${urls.map((url, i) => `
                            <img src="${url}" class="thumb-img w-12 h-12 object-contain bg-slate-950/60 backdrop-blur-md rounded-lg border-2 ${i === 0 ? 'border-amber-500' : 'border-slate-800'} cursor-pointer hover:border-amber-500 transition shrink-0 p-1 shadow-lg" onclick="cambiarImagenPrincipal('${url}', this)">
                        `).join('')}
                    </div>
                    ` : ''}
                </div>

                <!-- Countdown Individual -->
                <div class="grid grid-cols-4 gap-2 md:gap-4 max-w-md mx-auto mt-10 bg-slate-900 p-4 rounded-2xl border border-slate-800 countdown-wrapper" data-deadline="${sorteo.fecha_sorteo}" data-linkvivo="${sorteo.link_vivo || ''}">
                    <div class="p-2"><span class="days text-3xl font-bold text-amber-400 block">00</span><span class="text-xs text-slate-500 uppercase">Días</span></div>
                    <div class="p-2"><span class="hours text-3xl font-bold text-amber-400 block">00</span><span class="text-xs text-slate-500 uppercase">Horas</span></div>
                    <div class="p-2"><span class="minutes text-3xl font-bold text-amber-400 block">00</span><span class="text-xs text-slate-500 uppercase">Min</span></div>
                    <div class="p-2"><span class="seconds text-3xl font-bold text-amber-400 block">00</span><span class="text-xs text-slate-500 uppercase">Seg</span></div>
                </div>

                <div class="live-btn-container mt-6 hidden">
                    <a href="${sorteo.link_vivo || '#'}" target="_blank" class="bg-red-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition animate-pulse inline-block uppercase tracking-wider text-sm shadow-lg shadow-red-600/20">
                        🔴 Ver sorteo en vivo
                    </a>
                </div>

                <button onclick="seleccionarYComprar('${sorteo.id}')" class="mt-8 bg-gold text-slate-950 font-bold px-8 py-3 rounded-xl hover:opacity-90 transition">
                    Participar en este sorteo
                </button>
            </div>
        `;
    }).join('');
    } catch (err) {
        console.error("Error crítico:", err);
        container.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Error inesperado en la carga.</p></div>`;
    }
}

function actualizarPreciosUI() {
    // Actualizar botones de packs principales
    [1, 10, 15].forEach(chances => {
        const btn = document.getElementById(`btn-pack-${chances}`);
        if (btn) {
            const precio = obtenerPrecioCalculado(chances);
            btn.innerText = `Elegir por $${precio.toLocaleString('es-AR')}`;
        }
    });

    // Actualizar modal de extras
    document.querySelectorAll('.btn-extra').forEach(btn => {
        const chances = parseInt(btn.getAttribute('data-chances'));
        const label = btn.querySelector('.label-precio');
        if (label) {
            const precio = obtenerPrecioCalculado(chances);
            label.innerText = `$${precio.toLocaleString('es-AR')}`;
        }
    });
}

window.seleccionarYComprar = function(id) {
    SORTEO_ACTIVO_ID = id;
    actualizarPreciosUI();

    // Mostrar la sección de compra
    const comprarSection = document.getElementById('comprar');
    comprarSection.classList.remove('hidden');

    // Mostrar el título del sorteo seleccionado en la sección de compra
    const sorteo = sorteosDisponibles.find(s => String(s.id) === String(id));
    const labelSorteo = document.getElementById('comprarTituloSorteo');
    if (labelSorteo && sorteo) {
        labelSorteo.querySelector('span').innerText = sorteo.titulo;
        labelSorteo.classList.remove('hidden');
    }

    // Efecto visual de selección
    document.querySelectorAll('.raffle-card').forEach(card => card.classList.remove('ring-2', 'ring-amber-500', 'bg-slate-900/20'));
    const selected = document.getElementById(`sorteo-${id}`);
    selected.classList.add('ring-2', 'ring-amber-500', 'bg-slate-900/20', 'rounded-3xl', 'p-4');
    
    comprarSection.scrollIntoView({ behavior: 'smooth' });
}
cargarInfoPublica();
cargarGanadores();

// Cuenta regresiva dinámica
setInterval(() => {
    const ahora = new Date().getTime();

    document.querySelectorAll('.countdown-wrapper').forEach(wrapper => {
        const deadlineStr = wrapper.getAttribute('data-deadline');
        if (!deadlineStr) return;
        
        const card = wrapper.closest('.raffle-card');
        const localLiveBtn = card?.querySelector('.live-btn-container');
        
        const deadline = new Date(deadlineStr).getTime();
        const diferencia = deadline - ahora;
        
        if (diferencia > 0) {
            // Si falta menos de 4 horas (14,400,000 ms)
            if (diferencia <= 14400000) {
                const link = wrapper.getAttribute('data-linkvivo');
                if (link && link.trim() !== "" && link !== "#") {
                    // Mostrar botón en la tarjeta específica
                    if (localLiveBtn) {
                        localLiveBtn.classList.remove('hidden');
                        const anchor = localLiveBtn.querySelector('a');
                        if (anchor) anchor.href = link;
                    }
                }
            } else {
                if (localLiveBtn) localLiveBtn.classList.add('hidden');
            }

            wrapper.querySelector('.days').innerText = Math.floor(diferencia / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
            wrapper.querySelector('.hours').innerText = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            wrapper.querySelector('.minutes').innerText = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            wrapper.querySelector('.seconds').innerText = Math.floor((diferencia % (1000 * 60)) / 1000).toString().padStart(2, '0');
        } else {
            wrapper.querySelector('.days').innerText = "00";
            wrapper.querySelector('.hours').innerText = "00";
            wrapper.querySelector('.minutes').innerText = "00";
            wrapper.querySelector('.seconds').innerText = "00";

            if (localLiveBtn) localLiveBtn.classList.add('hidden');

            // Desaparecer el sorteo de la página con una transición
            const card = wrapper.closest('.raffle-card');
            if (card && !card.classList.contains('hidden')) {
                card.style.opacity = '0';
                card.style.transition = 'opacity 0.8s ease';
                setTimeout(() => {
                    card.classList.add('hidden');
                }, 800);
            }
        }
    });
}, 1000);

// Control de Modal de Checkout
let currentUserRole = 'user';

function abrirPack(chances) {
    const precio = obtenerPrecioCalculado(chances);
    abrirModal(chances, precio);
}

function abrirModal(chances, precio) {
    document.getElementById('chancesInput').value = chances;
    document.getElementById('modalDetalle').innerText = `${chances} chance${chances > 1 ? 's' : ''} para el sorteo`;
    document.getElementById('totalPagarDisplay').innerText = `$${precio.toLocaleString('es-AR')}`;
    document.getElementById('checkoutModal').style.display = 'flex';
}
function cerrarModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

// Función estilo Mercado Libre para cambiar imagen principal
window.cambiarImagenPrincipal = function(url, el) {
    const card = el.closest('.raffle-card');
    const mainImg = card.querySelector('.mainImgView');
    if (!mainImg) return;
    
    // Efecto de transición suave
    mainImg.style.opacity = '0.5';
    setTimeout(() => {
        mainImg.src = obtenerUrlDirecta(url);
        mainImg.style.opacity = '1';
    }, 100);
    
    // Resaltar miniatura activa
    card.querySelectorAll('.thumb-img').forEach(t => t.classList.replace('border-amber-500', 'border-slate-800'));
    el.classList.replace('border-slate-800', 'border-amber-500');
}

// Control de Modal de Más Chances
function abrirChancesModal() {
    document.getElementById('chancesModal').style.display = 'flex';
}
function cerrarChancesModal() {
    document.getElementById('chancesModal').style.display = 'none';
}
function seleccionarExtraPack(chances) {
    cerrarChancesModal();
    setTimeout(() => abrirPack(chances), 100);
}

// Manejo automático de la interfaz según el estado del usuario
async function actualizarInterfazAuth(user) {
    const authSection = document.getElementById('authSection');
    if (user) {
        // Estado temporal mientras carga el rol
        if (!authSection.innerHTML.includes('Salir')) {
            authSection.innerHTML = `<span class="text-slate-500 text-xs animate-pulse">Cargando sesión...</span>`;
        }

        // Consultar rol en la base de datos
        console.log("Buscando rol para el usuario:", user.id);
        const { data: profile, error } = await supabaseClient
            .from('usuarios')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(); // Usamos maybeSingle para evitar errores si no existe la fila
        
        if (error) {
            console.error("Error de Supabase:", error.message);
        }
        if (!profile) {
            console.warn("No se encontró perfil para este ID en la tabla 'usuarios'.");
        }
        
        currentUserRole = profile?.role || 'user';
        console.log("Rol detectado:", currentUserRole);
        const isAdmin = currentUserRole.toLowerCase() === 'admin';

        authSection.innerHTML = `
            <div class="flex items-center gap-3">
                ${isAdmin ? `<span onclick="abrirAdmin()" class="text-amber-500 border-amber-500/50 text-[10px] cursor-pointer uppercase font-black border px-2 py-1 rounded">Admin</span>` : ''}
                <span class="text-slate-400 text-xs hidden md:inline font-medium">${user.email}</span>
                <button onclick="supabaseClient.auth.signOut()" class="text-slate-500 hover:text-red-400 text-xs font-semibold transition">Salir</button>
                <button onclick="abrirMisCompras()" class="bg-red-premium text-white font-bold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition whitespace-nowrap">
                    Mis Compras
                </button>
            </div>
        `;
        if(document.getElementById('email')) document.getElementById('email').value = user.email;
    } else {
        authSection.innerHTML = `
            <button onclick="abrirAuth()" class="text-slate-300 hover:text-white text-sm font-semibold transition">Registrarse / Entrar</button>
        `;
    }
}

// Escuchar cambios de sesión (Login/Logout/Registro)
supabaseClient.auth.onAuthStateChange((event, session) => {
    actualizarInterfazAuth(session?.user ?? null);
});

// Lógica para ver Mis Compras
async function abrirMisCompras() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return abrirAuth();

    const lista = document.getElementById('listaCompras');
    document.getElementById('purchasesModal').style.display = 'flex';

    // Consultamos las compras y los números asignados (si la relación existe en tu DB)
    const { data: compras, error } = await supabaseClient
        .from('compras')
        .select(`
            id,
            cantidad_chances,
            estado_pago,
            comprobante_url,
            created_at,
            sorteos (titulo),
            numeros_asignados (numero_rifa)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        lista.innerHTML = `<p class="text-red-400 text-center">Error al cargar compras: ${error.message}</p>`;
        return;
    }

    if (!compras || compras.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-10 bg-slate-950 rounded-xl border border-dashed border-slate-800">
                <p class="text-slate-400">Aún no registraste ninguna compra.</p>
                <button onclick="cerrarMisCompras()" class="text-gold text-sm mt-2 font-bold">¡Quiero participar!</button>
            </div>
        `;
        return;
    }

    lista.innerHTML = compras.map(compra => {
        const fecha = new Date(compra.created_at).toLocaleDateString('es-AR');
        const sorteoTitulo = compra.sorteos?.titulo || 'Sorteo';
        const statusVal = Number(compra.estado_pago);
        const badges = (compra.numeros_asignados && compra.numeros_asignados.length > 0)
            ? compra.numeros_asignados.map(n => `<span class="bg-amber-500/20 text-amber-500 px-2 py-1 rounded text-xs font-mono font-bold">${n.numero_rifa}</span>`).join('')
            : (statusVal === 2 
                ? '<span class="text-red-500 text-xs italic">Números revocados (Rechazado)</span>' 
                : '<span class="text-slate-500 text-xs italic">Pendiente de aprobación</span>');
        
        let statusText = 'Pendiente';
        let statusColor = 'text-amber-500 bg-amber-500/10';
        
        if (statusVal === 1) {
            statusText = 'Aprobado';
            statusColor = 'text-green-500 bg-green-500/10';
        } else if (statusVal === 2) {
            statusText = 'Rechazado';
            statusColor = 'text-red-500 bg-red-500/10';
        }

        let comprobanteAction = '';
        if (compra.comprobante_url) {
            comprobanteAction = `
                <button onclick="abrirImagenModal('${compra.comprobante_url}')" class="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-400/30 px-2 py-1 rounded hover:bg-blue-600/30 font-bold uppercase transition">
                    Ver Comprobante
                </button>`;
        } else if (statusVal === 0) {
            comprobanteAction = `
                <label for="file-${compra.id}" class="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded cursor-pointer hover:bg-slate-700 font-bold uppercase transition">
                    Subir Comprobante
                </label>
                <input type="file" id="file-${compra.id}" class="hidden" accept="image/*" onchange="subirComprobante('${compra.id}', this)">
            `;
        }

        return `
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-xs text-slate-500">${fecha} — ${sorteoTitulo}</p>
                        <h5 class="font-bold text-lg">${compra.cantidad_chances} Chances</h5>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-[10px] font-black uppercase px-2 py-1 rounded ${statusColor}">
                            ${statusText}
                        </span>
                        ${comprobanteAction}
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${badges}
                </div>
            </div>
        `;
    }).join('');
}

function cerrarMisCompras() {
    document.getElementById('purchasesModal').style.display = 'none';
}

// Lógica para subir el comprobante al Storage de Supabase
async function subirComprobante(compraId, input) {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Por favor, selecciona un archivo de imagen válido.");
        return;
    }

    const label = document.querySelector(`label[for="file-${compraId}"]`);
    const originalText = label.innerText;
    label.innerText = "Subiendo...";
    label.style.pointerEvents = "none";

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${compraId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`; // Se guardará en la raíz del bucket

        // 1. Subir al Bucket 'comprobantes'
        const { error: uploadError } = await supabaseClient.storage
            .from('comprobantes')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Obtener URL Pública
        const { data: { publicUrl } } = supabaseClient.storage
            .from('comprobantes')
            .getPublicUrl(filePath);

        // 3. Actualizar la tabla 'compras'
        const { error: updateError } = await supabaseClient
            .from('compras')
            .update({ comprobante_url: publicUrl })
            .eq('id', compraId);

        if (updateError) throw updateError;

        alert("¡Comprobante subido con éxito!");
        abrirMisCompras(); // Recargar la lista
    } catch (error) {
        alert("Error al subir el archivo: " + error.message);
        label.innerText = originalText;
        label.style.pointerEvents = "auto";
    }
}

/** Lógica de Visualización de Imágenes **/
window.abrirImagenModal = function(url) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('imgVisualizada');
    if (img && url) img.src = obtenerUrlDirecta(url);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.cerrarImagenModal = function() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// --- LÓGICA DE ADMINISTRACIÓN ---
function cambiarTabAdmin(tab) {
    document.getElementById('tabSorteos').classList.toggle('hidden', tab !== 'sorteos');
    document.getElementById('tabUsuarios').classList.toggle('hidden', tab !== 'usuarios');
    document.getElementById('tabVentas').classList.toggle('hidden', tab !== 'ventas');
    document.getElementById('tabGanadores').classList.toggle('hidden', tab !== 'ganadores');
    document.getElementById('tabRuleta').classList.toggle('hidden', tab !== 'ruleta');
    document.getElementById('btnNuevoSorteo').classList.toggle('hidden', tab !== 'sorteos');
    
    if (tab === 'usuarios') cargarUsuariosAdmin();
    else if (tab === 'sorteos') cargarSorteosAdmin();
    else if (tab === 'ventas') cargarVentasAdmin();
    else if (tab === 'ganadores') cargarGanadoresAdmin();
    else if (tab === 'ruleta') cargarSorteosParaRuleta();
}

async function cargarVentasAdmin() {
    const contenedor = document.getElementById('listaAdminVentas');
    contenedor.innerHTML = '<p class="text-center py-4">Cargando ventas...</p>';

    const { data: ventas, error } = await supabaseClient
        .from('compras')
        .select(`*, sorteos (titulo)`)
        .order('created_at', { ascending: false });

    if (error) {
        contenedor.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        return;
    }

    if (!ventas || ventas.length === 0) {
        contenedor.innerHTML = '<p class="text-slate-400 text-center py-4">No hay ventas registradas.</p>';
        return;
    }

    contenedor.innerHTML = ventas.map(v => {
        const statusVal = Number(v.estado_pago);
        const statusText = statusVal === 1 ? 'Aprobado' : (statusVal === 2 ? 'Rechazado' : 'Pendiente');
        const statusColor = statusVal === 1 ? 'text-green-500' : (statusVal === 2 ? 'text-red-500' : 'text-amber-500');

        return `
            <div class="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-sm">${v.nombre} ${v.apellido} <span class="text-xs font-normal text-slate-500">(${v.email})</span></p>
                        <p class="text-xs text-slate-400">${v.sorteos?.titulo || 'Sorteo'} - ${v.cantidad_chances} chances</p>
                        <p class="text-[10px] text-slate-500">DNI: ${v.dni || 'N/A'} | Tel: ${v.whatsapp || 'N/A'}</p>
                    </div>
                    <span class="text-[10px] font-black uppercase ${statusColor}">${statusText}</span>
                </div>
                <div class="flex justify-between items-center border-t border-slate-800 pt-3">
                    <div class="flex gap-2">
                        ${v.comprobante_url 
                            ? `<button onclick="abrirImagenModal('${v.comprobante_url}')" class="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase underline">Ver Comprobante</button>` 
                            : '<span class="text-xs text-slate-600 italic">Sin comprobante</span>'}
                    </div>
                    ${statusVal === 0 ? `
                        <div class="flex gap-2">
                            <button onclick="gestionarVenta('${v.id}', 1)" class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 transition font-bold">Aprobar</button>
                            <button onclick="gestionarVenta('${v.id}', 2)" class="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 transition font-bold">Rechazar</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function gestionarVenta(compraId, nuevoEstado) {
    const accion = nuevoEstado === 1 ? 'Aprobar' : 'Rechazar';
    const confirmMsg = nuevoEstado === 1 ? `¿Aprobar compra?` : `¿Rechazar compra? Se liberarán los números pero el comprobante permanecerá visible para revisión.`;
    const idNum = parseInt(compraId);
    
    if (!confirm(confirmMsg)) return;

    // 1. Actualizar el estado de la compra
    const updateData = { estado_pago: nuevoEstado };

    const { error } = await supabaseClient.from('compras').update(updateData).eq('id', idNum);
    if (error) {
        alert("Error al actualizar estado: " + error.message);
        return;
    }

    // 2. Si se rechaza, liberar números
    if (nuevoEstado === 2) {
        const { error: delError } = await supabaseClient.from('numeros_asignados').delete().eq('compra_id', idNum);
        if (delError) {
            alert("Compra rechazada, pero hubo un error liberando los números: " + delError.message);
        }
    }

    alert(`Compra ${accion}da con éxito.`);
    cargarVentasAdmin();
}
function abrirAdmin() {
    document.getElementById('adminModal').style.display = 'flex';
    cambiarTabAdmin('sorteos');
}

async function cargarUsuariosAdmin() {
    const { data: users, error } = await supabaseClient
        .from('usuarios')
        .select('*')
        .order('email');
    
    const contenedor = document.getElementById('listaAdminUsuarios');
    if (error) return contenedor.innerHTML = `<p class="text-red-500">${error.message}</p>`;

    contenedor.innerHTML = users.map(u => `
        <div class="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center">
            <div>
                <p class="font-bold text-sm">${u.email}</p>
                <p class="text-[10px] text-amber-500 font-mono">Pass: ${u.password || '******'}</p>
                <p class="text-[10px] text-slate-500 italic">Edad: ${u.edad || 'N/A'}</p>
            </div>
            <div class="flex items-center gap-3">
                <select onchange="cambiarRolUsuario('${u.id}', this.value)" class="bg-slate-900 text-xs border border-slate-700 rounded p-1 outline-none text-slate-300">
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
        </div>
    `).join('');
}

async function cambiarRolUsuario(userId, newRole) {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) {
        cargarUsuariosAdmin();
        return;
    }

    const { error } = await supabaseClient
        .from('usuarios')
        .update({ role: newRole })
        .eq('id', userId);
    
    if (error) alert("Error: " + error.message);
    else alert("Rol actualizado correctamente.");
}

function cerrarAdmin() { document.getElementById('adminModal').style.display = 'none'; }

async function cargarSorteosAdmin() {
    const { data, error } = await supabaseClient.from('sorteos').select('*').order('created_at', { ascending: false });
    const contenedor = document.getElementById('listaAdminSorteos');
    if (error) return contenedor.innerHTML = `<p class="text-red-500">${error.message}</p>`;
    
    // Guardamos los datos en cache para evitar errores de sintaxis en el HTML por saltos de línea o comillas
    window.adminSorteosCache = data;

    contenedor.innerHTML = data.map(s => `
        <div class="bg-slate-950 border ${s.activo ? 'border-amber-500/50' : 'border-slate-800'} p-2 rounded-lg flex justify-between items-center">
            <div class="flex items-center gap-3 overflow-hidden">
                ${s.imagen_url ? 
                    `<img src="${obtenerUrlDirecta(s.imagen_url.split(/[\n,]+/)[0].trim())}" class="w-10 h-10 object-contain bg-slate-800 rounded">` : 
                    `<div class="w-10 h-10 bg-slate-800 rounded"></div>`}
                <div class="overflow-hidden">
                    <p class="font-bold text-sm truncate">${s.titulo}</p>
                    <p class="text-[10px] text-slate-500">${new Date(s.fecha_sorteo).toLocaleDateString()} - Rango: ${s.min_numero}-${s.max_numero}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="prepararEdicionSorteo('${s.id}')" class="text-xs text-blue-400 hover:underline">Editar</button>
                <button onclick="borrarSorteo('${s.id}')" class="text-xs text-red-400 hover:underline">Borrar</button>
                <span class="text-[10px] ${s.activo ? 'text-green-500' : 'text-slate-600'} font-bold">${s.activo ? 'ACTIVO' : 'OFF'}</span>
            </div>
        </div>
    `).join('');
}

async function borrarSorteo(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este sorteo? Se borrarán permanentemente el sorteo y todas las participaciones asociadas.")) return;
    
    const { error } = await supabaseClient
        .from('sorteos')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar el sorteo: " + error.message);
    } else {
        alert("Sorteo eliminado correctamente.");
        cargarSorteosAdmin();
        if (id === SORTEO_ACTIVO_ID) location.reload();
    }
}

function prepararNuevoSorteo() {
    document.getElementById('formSorteo').reset();
    document.getElementById('sorteoEditId').value = "";
    document.getElementById('adminFormTitle').innerText = "Nuevo Sorteo";
}

window.prepararEdicionSorteo = function(id) {
    const s = (window.adminSorteosCache || []).find(x => String(x.id) === String(id));
    if (!s) return;

    document.getElementById('sorteoEditId').value = s.id;
    document.getElementById('adminTitulo').value = s.titulo || '';
    document.getElementById('adminDesc').value = s.descripcion || '';
    document.getElementById('adminImagen').value = s.imagen_url || '';
    document.getElementById('adminPrecioBase').value = s.precio_base || 10000;
    document.getElementById('adminMinNum').value = s.min_numero || 0;
    document.getElementById('adminMaxNum').value = s.max_numero || 9999;
    
    // Ajustar fecha para input datetime-local
    const d = new Date(s.fecha_sorteo);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('adminFecha').value = d.toISOString().slice(0, 16);
    document.getElementById('adminActivo').checked = s.activo;
    document.getElementById('adminLinkVivo').value = s.link_vivo || '';
    document.getElementById('adminFormTitle').innerText = "Editando Sorteo";
}

document.getElementById('formSorteo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('sorteoEditId').value || null;
    
    // Convertimos la fecha del input local a formato ISO UTC para Supabase
    const fechaLocal = document.getElementById('adminFecha').value;
    const fechaISO = new Date(fechaLocal).toISOString();

    const payload = {
        titulo: document.getElementById('adminTitulo').value,
        descripcion: document.getElementById('adminDesc').value,
        imagen_url: document.getElementById('adminImagen').value,
        precio_base: parseInt(document.getElementById('adminPrecioBase').value),
        min_numero: parseInt(document.getElementById('adminMinNum').value || 0),
        max_numero: parseInt(document.getElementById('adminMaxNum').value || 9999),
        fecha_sorteo: fechaISO,
        activo: document.getElementById('adminActivo').checked,
        link_vivo: document.getElementById('adminLinkVivo').value
    };

    let error;
    if (id) {
        const { error: err } = await supabaseClient.from('sorteos').update(payload).eq('id', id);
        error = err;
    } else {
        const { error: err } = await supabaseClient.from('sorteos').insert([payload]);
        error = err;
    }

    if (error) alert("Error: " + error.message);
    else {
        alert("Sorteo guardado correctamente.");
        prepararNuevoSorteo();
        cargarSorteosAdmin();
        // Si quieres que el sorteo actual de la página cambie si lo editaste:
        location.reload(); 
    }
});

// --- LÓGICA DE GANADORES ---
let listadoGanadoresCompleto = [];

async function cargarGanadores() {
    const container = document.getElementById('contenedorGanadores');
    const btnContainer = document.getElementById('btnVerTodosGanadoresContainer');

    const { data: ganadores, error } = await supabaseClient
        .from('ganadores')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !ganadores || ganadores.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center col-span-full py-10">Próximamente publicaremos a nuestros ganadores.</p>';
        if (btnContainer) btnContainer.classList.add('hidden');
        return;
    }

    listadoGanadoresCompleto = ganadores;

    if (ganadores.length > 6) {
        renderizarGanadores(ganadores.slice(0, 6));
        if (btnContainer) {
            btnContainer.classList.remove('hidden');
            document.getElementById('btnVerMasGanadores')?.classList.remove('hidden');
            document.getElementById('btnVerMenosGanadores')?.classList.add('hidden');
        }
    } else {
        renderizarGanadores(ganadores);
        if (btnContainer) btnContainer.classList.add('hidden');
    }
}

function renderizarGanadores(lista) {
    const container = document.getElementById('contenedorGanadores');
    container.innerHTML = lista.map(g => `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-amber-500/50 transition group flex flex-col h-full">
            <div class="aspect-[4/5] w-full bg-slate-950 overflow-hidden cursor-pointer shrink-0" onclick="abrirImagenModal('${g.foto_url}')">
                ${g.foto_url ? 
                    `<img src="${obtenerUrlDirecta(g.foto_url)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">` : 
                    `<div class="w-full h-full flex items-center justify-center text-slate-800 italic text-xs">Foto con el premio</div>`}
            </div>
            <div class="p-6 flex-1 flex flex-col justify-between">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-xl text-white">${g.nombre}</h4>
                    <span class="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-black uppercase">${g.fecha || ''}</span>
                </div>
                <p class="text-amber-500 font-bold flex items-center gap-2 mb-4 italic">
                    🏆 ${g.premio}
                </p>
                <div class="flex items-center gap-2 text-slate-500 text-xs">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    ${g.localidad || 'Argentina'}
                </div>
            </div>
        </div>
    `).join('');
}

window.mostrarTodosLosGanadores = function() {
    renderizarGanadores(listadoGanadoresCompleto);
    document.getElementById('btnVerMasGanadores')?.classList.add('hidden');
    document.getElementById('btnVerMenosGanadores')?.classList.remove('hidden');
}

window.mostrarMenosGanadores = function() {
    renderizarGanadores(listadoGanadoresCompleto.slice(0, 6));
    document.getElementById('btnVerMasGanadores')?.classList.remove('hidden');
    document.getElementById('btnVerMenosGanadores')?.classList.add('hidden');
    document.getElementById('seccionGanadores')?.scrollIntoView({ behavior: 'smooth' });
}

async function cargarGanadoresAdmin() {
    const { data, error } = await supabaseClient.from('ganadores').select('*').order('created_at', { ascending: false });
    const contenedor = document.getElementById('listaAdminGanadores');
    if (error) return contenedor.innerHTML = `<p class="text-red-500">${error.message}</p>`;
    
    contenedor.innerHTML = data.map(g => `
        <div class="bg-slate-950 border border-slate-800 p-3 rounded-lg flex justify-between items-center">
            <div class="flex items-center gap-3 overflow-hidden">
                <img src="${obtenerUrlDirecta(g.foto_url) || ''}" class="w-12 h-12 object-cover bg-slate-800 rounded" onerror="this.src='https://via.placeholder.com/50'">
                <div class="overflow-hidden">
                    <p class="font-bold text-sm truncate">${g.nombre}</p>
                    <p class="text-[10px] text-amber-500 truncate italic">${g.premio}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="prepararEdicionGanador('${g.id}', '${g.nombre}', '${g.premio}', '${g.localidad || ''}', '${g.fecha || ''}')" class="text-xs text-blue-400 hover:underline font-bold">Editar</button>
                <button onclick="borrarGanador('${g.id}')" class="text-xs text-red-400 hover:underline px-2 font-bold">Borrar</button>
            </div>
        </div>
    `).join('');
}

window.prepararEdicionGanador = function(id, nombre, premio, localidad, fecha) {
    document.getElementById('ganadorEditId').value = id;
    document.getElementById('winnerNombre').value = nombre;
    document.getElementById('winnerPremio').value = premio;
    document.getElementById('winnerLocalidad').value = localidad;
    document.getElementById('winnerFecha').value = fecha;
    document.getElementById('btnGuardarGanador').innerText = "Actualizar Ganador";
    document.getElementById('winnerNombre').focus();
}

window.previewWinnerImage = function(input) {
    const preview = document.getElementById('winnerPhotoPreview');
    if (input.files && input.files[0]) {
        preview.innerText = "Archivo seleccionado: " + input.files[0].name;
    }
}

document.getElementById('formGanador').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('ganadorEditId').value;
    const btn = document.getElementById('btnGuardarGanador');
    const fotoFile = document.getElementById('winnerFotoInput').files[0];
    
    btn.innerText = "Procesando...";
    btn.disabled = true;

    try {
        let fotoUrl = null;
        if (fotoFile) {
            const fileExt = fotoFile.name.split('.').pop();
            const fileName = `winner-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('comprobantes')
                .upload(fileName, fotoFile);
            
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabaseClient.storage.from('comprobantes').getPublicUrl(fileName);
            fotoUrl = publicUrl;
        }

        const payload = {
            nombre: document.getElementById('winnerNombre').value,
            premio: document.getElementById('winnerPremio').value,
            localidad: document.getElementById('winnerLocalidad').value,
            fecha: document.getElementById('winnerFecha').value,
            foto_url: fotoUrl
        };

        let error;
        if (id) {
            // Si no se subió foto nueva en la edición, mantenemos la anterior
            if (!fotoUrl) delete payload.foto_url;
            const { error: err } = await supabaseClient.from('ganadores').update(payload).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabaseClient.from('ganadores').insert([payload]);
            error = err;
        }

        if (error) throw error;

        alert(id ? "Ganador actualizado." : "Ganador registrado correctamente.");
        e.target.reset();
        document.getElementById('ganadorEditId').value = "";
        document.getElementById('btnGuardarGanador').innerText = "Guardar Ganador";
        document.getElementById('winnerPhotoPreview').innerText = "Seleccionar archivo";
        cargarGanadoresAdmin();
        cargarGanadores();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = "Guardar Ganador";
        btn.disabled = false;
    }
});

async function borrarGanador(id) {
    if (!confirm("¿Eliminar este ganador?")) return;
    const { error } = await supabaseClient.from('ganadores').delete().eq('id', id);
    if (error) alert(error.message);
    else {
        cargarGanadoresAdmin();
        cargarGanadores();
    }
}

// Control de Modal de Autenticación
let isLoginMode = true;
let captchaResult;

// Función para generar un captcha matemático simple
function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    captchaResult = num1 + num2;
    const questionEl = document.getElementById('captchaQuestion');
    if (questionEl) questionEl.innerText = `Seguridad: ¿Cuánto es ${num1} + ${num2}?`;
}

function abrirAuth() {
    document.getElementById('authModal').style.display = 'flex';
}
function cerrarAuth() {
    document.getElementById('authModal').style.display = 'none';
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const desc = document.getElementById('authDesc');
    const btn = document.getElementById('btnAuth');
    const toggle = document.getElementById('authToggleText');
    const ageField = document.getElementById('ageField');
    const captchaField = document.getElementById('captchaField');

    if (isLoginMode) {
        title.innerText = "Iniciar Sesión";
        desc.innerText = "Ingresá a tu cuenta para ver tus chances y sorteos.";
        btn.innerText = "Entrar";
        toggle.innerHTML = '¿No tenés cuenta? <span class="text-gold cursor-pointer hover:underline" onclick="toggleAuthMode()">Registrate</span>';
        ageField.classList.add('hidden');
        captchaField.classList.add('hidden');
    } else {
        title.innerText = "Crear nueva cuenta";
        desc.innerText = "Unite para gestionar tus chances y ver sorteos previos.";
        btn.innerText = "Crear Cuenta";
        toggle.innerHTML = '¿Ya tenés cuenta? <span class="text-gold cursor-pointer hover:underline" onclick="toggleAuthMode()">Ingresá</span>';
        ageField.classList.remove('hidden');
        captchaField.classList.remove('hidden');
        generateCaptcha();
    }
}

// Envío del Formulario de Auth (Login o Registro)
document.getElementById('formAuth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('btnAuth');

    btn.innerText = "Procesando...";
    btn.disabled = true;

    let result;
    if (isLoginMode) {
        // Lógica de Login
        result = await supabaseClient.auth.signInWithPassword({ email, password });
    } else {
        // Validaciones para Registro
        const age = document.getElementById('authAge').value;
        const captchaInput = document.getElementById('authCaptcha').value;

        if (!age || parseInt(age) < 18) {
            alert("Debes ser mayor de 18 años para participar.");
            btn.innerText = "Crear Cuenta";
            btn.disabled = false;
            return;
        }

        if (parseInt(captchaInput) !== captchaResult) {
            alert("Captcha incorrecto. Por favor, resolvé la suma.");
            generateCaptcha();
            btn.innerText = "Crear Cuenta";
            btn.disabled = false;
            return;
        }

        // 1. Registro en Supabase Auth
        result = await supabaseClient.auth.signUp({ email, password });

        if (!result.error && result.data.user) {
            // 2. Creación manual del perfil en la tabla pública 'usuarios'
            const { error: dbError } = await supabaseClient
                .from('usuarios')
                .insert([{
                    id: result.data.user.id,
                    email: email,
                    edad: parseInt(age),
                    role: 'user',
                    password: password
                }]);
            if (dbError) console.error("Error al crear perfil en tabla usuarios:", dbError.message);
        }
    }

    const { data, error } = result;

    btn.innerText = isLoginMode ? "Entrar" : "Crear Cuenta";
    btn.disabled = false;

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert(isLoginMode ? "¡Bienvenido!" : "¡Cuenta creada con éxito!");
        cerrarAuth();
        document.getElementById('formAuth').reset();
    }
});

// Envío del Formulario e Inserción en Supabase
document.getElementById('formCompra').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const email = document.getElementById('email').value;
    const whatsapp = document.getElementById('whatsapp').value;
    const cantidad = parseInt(document.getElementById('chancesInput').value);
    const dni = document.getElementById('dni').value;
    const fecha_nacimiento = document.getElementById('fecha_nacimiento').value;
    const direccion = document.getElementById('direccion').value;
    const localidad = document.getElementById('localidad').value;
    const provincia = document.getElementById('provincia').value;
    const codigo_postal = document.getElementById('codigo_postal').value;

    if (!SORTEO_ACTIVO_ID) {
        alert("No hay un sorteo activo en este momento.");
        return;
    }

    // Validación de edad (Mínimo 18 años)
    const dob = new Date(fecha_nacimiento);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    if (age < 18) {
        alert("Debés ser mayor de 18 años para participar del sorteo.");
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Procesando...";
    btn.disabled = true;

    // Obtener el usuario logueado actualmente (si existe)
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 1. Guardar los datos de la compra
    const { data: compra, error } = await supabaseClient
        .from('compras')
        .insert([{ 
            sorteo_id: parseInt(SORTEO_ACTIVO_ID), 
            user_id: user ? user.id : null, // <--- Enviamos el ID del usuario
            nombre, 
            apellido, 
            email, 
            whatsapp, 
            dni,
            fecha_nacimiento,
            direccion,
            localidad,
            provincia,
            codigo_postal,
            cantidad_chances: cantidad,
            estado_pago: 0
        }])
        .select()
        .single();

    if (error) {
        btn.innerText = "Confirmar Pedido";
        btn.disabled = false;
        alert("Hubo un error procesando tu solicitud: " + error.message);
        return;
    }

    // 2. Asignar números aleatorios vía RPC
    const { data: numeros, error: rpcError } = await supabaseClient
        .rpc('asignar_numeros_aleatorios', { p_compra_id: compra.id });

    if (rpcError) {
        alert("Error al asignar números: " + rpcError.message);
        btn.innerText = "Confirmar Pedido";
        btn.disabled = false;
        return;
    }

    const listaNumeros = numeros.map(n => n.numero_rifa).join(', ');

    // Redirección o aviso para el pago manual
    alert(`¡Registro Exitoso!\n\nTus números asignados son: ${listaNumeros}\n\nAhora podrás subir tu comprobante en la sección 'Mis Compras' que se abrirá a continuación.`);
    
    // Limpiamos el formulario y cerramos el modal
    btn.innerText = "Confirmar Pedido";
    btn.disabled = false;
    cerrarModal();
    e.target.reset();

    // Abrimos automáticamente "Mis Compras" para facilitar el proceso de subida de comprobante
    abrirMisCompras();
});

// --- LÓGICA DE LA RULETA ---
let participantesRuleta = [];
let ruletaAnguloActual = 0;
let ruletaGirando = false;
const sonidoRuleta = new Audio('ruleta.mp3'); // Asegúrate de que el archivo se llame así en tu carpeta
const sonidoGanador = new Audio('ganador.mp3');

async function cargarSorteosParaRuleta() {
    const select = document.getElementById('ruletaSorteoSelect');
    if (!select) return;

    try {
        const { data: sorteos, error } = await supabaseClient
            .from('sorteos')
            .select('id, titulo')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error en Ruleta:", error.message);
            select.innerHTML = `<option value="">Error: ${error.message}</option>`;
            return;
        }

        if (!sorteos || sorteos.length === 0) {
            select.innerHTML = '<option value="">No hay sorteos creados</option>';
            return;
        }

        select.innerHTML = '<option value="">-- Elegir un sorteo --</option>' + 
            sorteos.map(s => `<option value="${s.id}">${s.titulo}</option>`).join('');
    } catch (err) {
        select.innerHTML = '<option value="">Error inesperado</option>';
    }
}

async function prepararParticipantesRuleta() {
    const sorteoId = document.getElementById('ruletaSorteoSelect').value;
    const stats = document.getElementById('ruletaStats');
    const btn = document.getElementById('btnGirarRuleta');
    const resultado = document.getElementById('resultadoRuleta');
    
    if (!sorteoId) return;

    resultado.innerText = "";
    stats.innerText = "Buscando jugadores...";
    btn.disabled = true;

    // Consultar números aprobados con los nombres de los compradores
    const { data, error } = await supabaseClient
        .from('numeros_asignados')
        .select(`
            numero_rifa,
            compras!inner (
                nombre,
                apellido,
                estado_pago,
                sorteo_id
            )
        `)
        .eq('compras.sorteo_id', sorteoId)
        .eq('compras.estado_pago', 1); // Solo números PAGADOS/APROBADOS

    if (error || !data || data.length === 0) {
        stats.innerText = "No hay números aprobados para este sorteo.";
        participantesRuleta = [];
        dibujarRuleta();
        return;
    }

    participantesRuleta = data.map(item => ({
        numero: item.numero_rifa,
        nombre: `${item.compras.nombre} ${item.compras.apellido}`
    }));

    // Generar una paleta de colores única por cada nombre de comprador
    const nombresUnicos = [...new Set(participantesRuleta.map(p => p.nombre))];
    const paletaColores = nombresUnicos.reduce((acc, nombre, i) => {
        acc[nombre] = `hsl(${(i * 360) / nombresUnicos.length}, 75%, 50%)`;
        return acc;
    }, {});
    participantesRuleta.forEach(p => p.color = paletaColores[p.nombre]);

    stats.innerText = `${participantesRuleta.length} Números cargados para el sorteo`;
    btn.disabled = false;
    dibujarRuleta();
}

function dibujarRuleta() {
    const canvas = document.getElementById('ruletaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    const center = cw / 2;
    
    ctx.clearRect(0, 0, cw, ch);
    
    if (participantesRuleta.length === 0) {
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(center, center, center - 10, 0, Math.PI * 2); ctx.fill();
        return;
    }

    const total = participantesRuleta.length;
    const arcSize = (Math.PI * 2) / total;

    participantesRuleta.forEach((p, i) => {
        const angulo = ruletaAnguloActual + (i * arcSize);
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, center - 10, angulo, angulo + arcSize);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(angulo + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = total > 50 ? "bold 12px sans-serif" : "bold 20px sans-serif";
        ctx.fillText(p.numero, center - 40, 10);
        ctx.restore();
    });
}

window.girarRuleta = async function() {
    if (ruletaGirando || participantesRuleta.length === 0) return;
    
    ruletaGirando = true;
    document.getElementById('resultadoRuleta').innerText = "¡Sorteando!";
    
    // Reproducir sonido
    sonidoRuleta.currentTime = 0;
    try {
        await sonidoRuleta.play();
    } catch (e) {
        console.warn("El audio no pudo reproducirse:", e);
    }

    const duracion = 8500; // 8.5 segundos exactos
    const inicio = performance.now();
    const anguloInicial = ruletaAnguloActual;
    
    // Calculamos cuántas vueltas dará (mínimo 10 vueltas + un extra aleatorio)
    const vueltasTotales = (10 + Math.random() * 5) * (Math.PI * 2);

    function animar(tiempoActual) {
        const transcurrido = tiempoActual - inicio;
        const progreso = Math.min(transcurrido / duracion, 1);

        // Función de easing (Cubic Out) para un frenado suave al final
        const easing = 1 - Math.pow(1 - progreso, 3);
        
        ruletaAnguloActual = anguloInicial + (vueltasTotales * easing);
        dibujarRuleta();

        if (progreso < 1) {
            requestAnimationFrame(animar);
        } else {
            ruletaGirando = false;
            finalizarSorteoRuleta();
        }
    }
    requestAnimationFrame(animar);
}

function finalizarSorteoRuleta() {
    const total = participantesRuleta.length;
    const arcSize = (Math.PI * 2) / total;
    
    // El marcador (flecha) está en la parte superior, que corresponde a 270 grados (1.5 * PI)
    // Calculamos el ángulo relativo del marcador respecto al inicio de la ruleta (índice 0)
    const anguloMarcador = 1.5 * Math.PI;
    let anguloRelativo = (anguloMarcador - ruletaAnguloActual) % (2 * Math.PI);
    if (anguloRelativo < 0) anguloRelativo += 2 * Math.PI;
    
    let indiceGanador = Math.floor(anguloRelativo / arcSize);
    
    // Ajuste de seguridad para el índice
    if (indiceGanador >= total) indiceGanador = 0;
    if (indiceGanador < 0) indiceGanador = 0;
    
    const ganador = participantesRuleta[indiceGanador];
    document.getElementById('resultadoRuleta').innerText = `N° ${ganador.numero} - ${ganador.nombre}`;

    // Reproducir sonido de ganador
    sonidoGanador.currentTime = 0;
    sonidoGanador.play().catch(e => console.warn("No se pudo reproducir el sonido de ganador:", e));

    // Lanzar confeti en lugar del alert
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff'] // Colores dorados y blanco para combinar con el sitio
    });
}