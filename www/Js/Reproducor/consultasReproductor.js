// js/consultasReproductor.js
// Trae y pinta Artistas + Géneros desde Supabase
// - Artistas: botón con imagen (desde storage si existe url_imagen_art, si no avatar)
// - Géneros: botón sin imagen, con card de texto

// Usa el mismo cliente si ya existe (recomendado)
const supa = (typeof _supabase !== "undefined" && _supabase?.from)
  ? _supabase
  : conectarSupabase();

/** =========================
 * Helpers
 ========================= */
function clearNode(node) {
  if (!node) return;
  node.innerHTML = "";
}

function makeAvatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=0D3B2E&color=fff&bold=true`;
}

function safeText(v, fallback = "") {
  return (v === null || v === undefined) ? fallback : String(v);
}

/**
 * Convierte el path guardado en BD en URL usable.
 * - Si ya viene una URL completa (http...), la usa tal cual.
 * - Si viene un path (carpeta/archivo.jpg), arma URL pública del bucket.
 */
function resolvePublicStorageUrl(bucket, pathOrUrl) {
  if (!pathOrUrl) return null;

  // Si ya es URL completa
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // Si es path interno: usamos getPublicUrl
  const { data } = supa.storage.from(bucket).getPublicUrl(pathOrUrl);
  return data?.publicUrl || null;
}

/** =========================
 * ARTISTAS
 * - Trae artista + nombre del género
 * - Usa url_imagen_art si existe (path del bucket audio)
 ========================= */
async function renderArtistas() {
  const artistRow = document.getElementById("artistRow");
  if (!artistRow) {
    console.warn("[renderArtistas] No existe #artistRow en el HTML");
    return;
  }

  clearNode(artistRow);

  // 1) Traer artistas (incluye url_imagen_art)
  const { data: artistas, error: aErr } = await supa
    .from("artista")
    .select("id_artista, nombre, genero_id, descripcion, url_imagen_art")
    .order("nombre", { ascending: true });

  if (aErr) {
    console.error("[renderArtistas] Error:", aErr);
    artistRow.textContent = "Error cargando artistas";
    artistRow.style.opacity = "0.75";
    return;
  }

  if (!artistas || artistas.length === 0) {
    artistRow.textContent = "No hay artistas aún";
    artistRow.style.opacity = "0.75";
    return;
  }

  // 2) Traer géneros para mapear el nombre
  const { data: generos, error: gErr } = await supa
    .from("genero")
    .select("id_gener, nombre_genero");

  if (gErr) console.error("[renderArtistas] Error generos:", gErr);

  const mapGenero = new Map((generos || []).map(g => [g.id_gener, g.nombre_genero]));

  // 3) Pintar dinámicamente
  artistas.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = "artist";
    btn.type = "button";
    btn.setAttribute("aria-label", a.nombre);
    btn.dataset.artistaId = a.id_artista;

    const img = document.createElement("img");
    img.className = "artist-img";
    img.alt = a.nombre;

    // Si hay imagen en BD -> usar Storage, si no -> avatar
    const storageUrl = resolvePublicStorageUrl("audio", a.url_imagen_art);
    img.src = storageUrl || makeAvatarUrl(a.nombre);

    // fallback si la imagen falla (404, etc.)
    img.onerror = () => {
      img.onerror = null;
      img.src = makeAvatarUrl(a.nombre);
    };

    const caption = document.createElement("div");
    caption.className = "artist-caption";

    const name = document.createElement("div");
    name.className = "artist-name";
    name.textContent = safeText(a.nombre, "Artista");

    const genre = document.createElement("div");
    genre.className = "artist-genre";
    genre.textContent = mapGenero.get(a.genero_id) || "Sin género";

    caption.appendChild(name);
    caption.appendChild(genre);

    btn.appendChild(img);
    btn.appendChild(caption);

    // Click (por ahora log)
    btn.addEventListener("click", () => {
      console.log("🎤 Artista seleccionado:", {
        id: a.id_artista,
        nombre: a.nombre,
        genero: mapGenero.get(a.genero_id) || null,
      });

      // Aquí después puedes hacer:
      // cargarAlbumesPorArtista(a.id_artista)
      // o filtrar playlist por artista
    });

    artistRow.appendChild(btn);
  });
}

/** =========================
 * GENEROS
 * - Botones sin imagen (card)
 ========================= */
async function renderGeneros() {
  const genreRow = document.getElementById("genreRow");
  if (!genreRow) {
    console.warn("[renderGeneros] No existe #genreRow en el HTML");
    return;
  }

  clearNode(genreRow);

  const { data: generos, error } = await supa
    .from("genero")
    .select("id_gener, nombre_genero, decada")
    .order("nombre_genero", { ascending: true });

  if (error) {
    console.error("[renderGeneros] Error:", error);
    genreRow.textContent = "Error cargando géneros";
    genreRow.style.opacity = "0.75";
    return;
  }

  if (!generos || generos.length === 0) {
    genreRow.textContent = "No hay géneros aún";
    genreRow.style.opacity = "0.75";
    return;
  }

  generos.forEach((g) => {
    const btn = document.createElement("button");
    btn.className = "genre";
    btn.type = "button";
    btn.setAttribute("aria-label", g.nombre_genero);
    btn.dataset.generoId = g.id_gener;

    // Card interna para el look
    const card = document.createElement("div");
    card.className = "genre-card";

    const name = document.createElement("div");
    name.className = "genre-name";
    name.textContent = safeText(g.nombre_genero, "Género");

    const decade = document.createElement("div");
    decade.className = "genre-decade";
    decade.textContent = g.decada ? `${new Date(g.decada).getFullYear()}s` : "";

    card.appendChild(name);
    if (decade.textContent) card.appendChild(decade);

    btn.appendChild(card);

    btn.addEventListener("click", () => {
      console.log("🎸 Género seleccionado:", {
        id: g.id_gener,
        nombre: g.nombre_genero,
        decada: g.decada,
      });

      // Aquí después puedes hacer:
      // cargarArtistasPorGenero(g.id_gener)
      // filtrar playlist por género
    });

    genreRow.appendChild(btn);
  });
}

/** =========================
 * INIT
 * - Si lo llamas desde verificarSesion() mejor.
 * - También lo dejamos auto-run por si se te olvida.
 ========================= */
async function initConsultasReproductor() {
  try {
    await renderArtistas();
    await renderGeneros();
  } catch (e) {
    console.error("❌ initConsultasReproductor:", e);
  }
}



// Exponer global por si quieres llamarlas desde reproductor.js
window.initConsultasReproductor = initConsultasReproductor;
window.renderArtistas = renderArtistas;
window.renderGeneros = renderGeneros;
