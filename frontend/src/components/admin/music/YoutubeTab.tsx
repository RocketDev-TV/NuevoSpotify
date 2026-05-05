'use client';
import { useYoutubeUpload } from '../../../hooks/useYoutubeUpload';

export default function YoutubeTab() {
  const {
    // YouTube Data
    url, setUrl, isConsulting, tracks, playlistName, setPlaylistName, albumYear, setAlbumYear, handleConsultar, handleLimpiar,
    // Contexto & Combos
    genres, artists, albums, genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    // Modales & Formularios
    activeModal, setActiveModal, formG, setFormG, formArt, setFormArt, formAlb, setFormAlb,
    coverPreview, setCoverPreview, saveGenero, saveArtista, saveAlbum, openAlbumModal,
    updateTrackTitle, toggleTrack,
    downloadSelected, isDownloading, progress, progressText
  } = useYoutubeUpload();

  return (
    <div className="music-tab active">
      <div className="glass-panel">

        {/* CABECERA */}
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="ph-fill ph-youtube-logo" style={{ color: '#ff0000', fontSize: '1.8rem' }}></i>
          Importador desde YouTube
        </h3>
        <p className="instruction-text">Pega el link de una playlist o video para procesar su contenido.</p>

        {/* BUSCADOR */}
        <div className="input-group-row mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
          <input
            type="text"
            placeholder="https://www.youtube.com/playlist?list=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: '1', margin: 0, minWidth: '0' }}
          />
          <button className="btn-primary" onClick={handleConsultar} disabled={isConsulting}
            style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
            <i className="ph ph-magnifying-glass"></i> {isConsulting ? 'Buscando...' : 'Consultar'}
          </button>

          {tracks.length > 0 && (
            <button className="btn-nuclear" onClick={handleLimpiar} title="Limpiar todo"
              style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0 20px', height: '42px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px', justifySelf: 'center' }}>
              <i className="ph ph-trash fs-5"></i> Limpiar
            </button>
          )}
        </div>

        <div> <br /></div>

        {tracks.length > 0 && (
          <div className="glass-panel animate__animated animate__fadeIn mt-4" style={{ padding: '25px' }}>

            {/* COMBOS DE CONTEXTO */}
            <div className="grid-2-cols" style={{ marginBottom: '20px' }}>
              <div>
                <label>Género para la descarga</label>
                <div className="input-group-row compact">
                  <select value={genreId} onChange={(e) => setGenreId(e.target.value)}>
                    <option value="">Seleccionar Género</option>
                    {genres.map((g: any) => (
                      <option key={`gen-${g.id_gener}`} value={g.id_gener}>{g.nombre_genero}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon" onClick={() => setActiveModal('genero')} title="Nuevo Género">
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
              </div>

              <div>
                <label>Artista (Seleccionar o crear nuevo)</label>
                <div className="input-group-row compact">
                  <select value={artistId} onChange={(e) => setArtistId(e.target.value)} disabled={!genreId}>
                    <option value="">{genreId ? 'Selecciona Artista' : 'Elige género primero'}</option>
                    {artists.map((a: any) => (
                      <option key={`art-${a.id_artista}`} value={a.id_artista}>{a.nombre}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon" onClick={() => setActiveModal('artista')} disabled={!genreId} title="Nuevo Artista">
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* FILA 2: ÁLBUM EXISTENTE */}
            <div className="grid-2-cols" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '25px', marginBottom: '30px' }}>
              <div>
                <label>Álbum Existente (Opcional)</label>
                <div className="input-group-row compact">
                  <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} disabled={!artistId}>
                    <option value="">{artistId ? 'Nuevo Álbum (o seleccionar)' : 'Elige artista primero'}</option>
                    {albums.map((al: any) => (
                      <option key={`alb-${al.id_album}`} value={al.id_album}>{al.titulo_album}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon" onClick={openAlbumModal} disabled={!artistId} title="Nuevo Álbum">
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
              </div>
              <div></div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="file-list-area mb-4" style={{ width: '100%', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', padding: '15px' }}>
              <table className="table table-dark table-hover table-sm align-middle mb-0" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="text-secondary" style={{ fontSize: '0.85rem', height: '50px' }}>
                    {/* Columna Check: Más ancha para alejarlo de la orilla izquierda */}
                    <th style={{ width: '100px', textAlign: 'center' }}><i className="ph ph-check-square-offset fs-4"></i></th>

                    <th style={{ textAlign: 'center' }}>Título Final en Catálogo</th>

                    {/* Columna Tiempo: Más ancha para alejarlo de la orilla derecha */}
                    <th style={{ width: '120px', textAlign: 'center' }}><i className="ph ph-clock fs-4"></i></th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track, idx) => (
                    <tr key={idx} style={{ height: '60px', opacity: track.selected ? 1 : 0.5 }}>
                      {/* ✅ Check centrado y más grande */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={track.selected}
                          onChange={() => toggleTrack(idx)}
                          style={{
                            accentColor: '#1db954',
                            transform: 'scale(1.4)',
                            cursor: 'pointer'
                          }}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="text"
                          value={track.titulo}
                          onChange={(e) => updateTrackTitle(idx, e.target.value)}
                          disabled={!track.selected}
                          className="edit-input-yt"
                          style={{
                            width: '75%',
                            margin: '0 auto',
                            textAlign: 'center',
                            display: 'block',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '0.95rem'
                          }}
                        />
                      </td>

                      {/* ⏱️ Tiempo centrado y con fuente más grande */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="font-monospace" style={{ color: '#bbb', fontSize: '0.95rem' }}>
                          {track.duracion_fmt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 📊 BARRA DE PROGRESO DINÁMICA */}
            {isDownloading && (
              <div className="progress-wrapper mt-5 animate__animated animate__fadeIn"
                style={{ marginBottom: '35px' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#1db954', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    <i className="ph ph-activity ph-spin mr-2"></i> {progressText}
                  </span>
                  <span style={{ color: '#bbb', fontSize: '0.9rem', fontWeight: 'bold' }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #1db954 0%, #1ed760 100%)',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)', // Animación más fluida[cite: 4]
                      boxShadow: '0 0 15px rgba(29, 185, 84, 0.4)'
                    }}
                  />
                </div>
              </div>
            )}

            <button
              className="btn-primary full-width mt-4"
              style={{ height: '50px', fontSize: '1rem', fontWeight: 'bold' }}
              // CONECTAMOS LA FUNCIÓN
              onClick={downloadSelected}
              // Prevenimos doble clic
              disabled={isDownloading || isConsulting}
            >
              {isDownloading ? (
                <>
                  <i className="ph ph-spinner ph-spin fs-4"></i> Procesando...
                </    >
              ) : (
                <>
                  <i className="ph ph-rocket-launch fs-4"></i> Iniciar Descarga e Inserción
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* --- MODALES TRASPLANTADOS DEL MANUAL ---[cite: 1] */}
      {activeModal && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <h3>{activeModal === 'genero' ? 'Nuevo Género' : activeModal === 'artista' ? 'Nuevo Artista' : 'Nuevo Álbum'}</h3>

            {activeModal === 'genero' && (
              <>
                <input type="text" placeholder="Ej. Rock" value={formG.nombre || ''} onChange={e => setFormG({ ...formG, nombre: e.target.value })} />
                <select value={formG.decada} onChange={e => setFormG({ ...formG, decada: e.target.value })}><option value="2020-01-01">2020s</option><option value="2010-01-01">2010s</option></select>
                <div className="modal-actions"><button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button><button className="btn-confirm" onClick={saveGenero}>Guardar</button></div>
              </>
            )}

            {activeModal === 'artista' && (
              <>
                <input type="text" placeholder="Nombre Artista" value={formArt.nombre || ''} onChange={e => setFormArt({ ...formArt, nombre: e.target.value })} />
                <textarea placeholder="Descripción" value={formArt.desc} onChange={e => setFormArt({ ...formArt, desc: e.target.value })} />
                <div className="modal-actions"><button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button><button className="btn-confirm" onClick={saveArtista}>Guardar</button></div>
              </>
            )}

            {activeModal === 'album' && (
              <>
                <input type="text" placeholder="Título Álbum" value={formAlb.titulo || ''} onChange={e => setFormAlb({ ...formAlb, titulo: e.target.value })} />
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#bbb', fontSize: '13px', display: 'block', marginBottom: '5px' }}>Portada del Disco</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="file" accept="image/*" onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setFormAlb({ ...formAlb, coverFile: file });
                        const reader = new FileReader();
                        reader.onloadend = () => setCoverPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                    {coverPreview && <img src={coverPreview} style={{ width: '50px', height: '50px', borderRadius: '5px', objectFit: 'cover' }} alt="Preview" />}
                  </div>
                </div>
                <div className="row-dates">
                  <input type="date" value={formAlb.fecha || ''} onChange={e => setFormAlb({ ...formAlb, fecha: e.target.value })} />
                  <input type="number" value={formAlb.num || 0} onChange={e => setFormAlb({ ...formAlb, num: parseInt(e.target.value) || 0 })} />
                </div>
                <select value={formAlb.tipo} onChange={e => setFormAlb({ ...formAlb, tipo: e.target.value })}><option value="ALBUM">Álbum (LP)</option><option value="EP">EP</option></select>
                <div className="modal-actions"><button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button><button className="btn-confirm" onClick={saveAlbum}>Crear</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}