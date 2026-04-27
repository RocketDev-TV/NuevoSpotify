'use client';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { useManualUpload } from '@/hooks/useManualUpload';

export default function ManualTab() {
  // Desempaquetamos todo desde el cerebro
  const {
    generos, artistas, albums, genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    albumActual, cancionesBD, isLocked, setIsLocked, stagedFiles,
    activeModal, setActiveModal, isEditing, setIsEditing, formG, setFormG, formArt, setFormArt, formAlb, setFormAlb,
    tbodyRef, tbodyStagingRef,
    procesarArchivosSeleccionados, quitarDeStaging, editarNombreStaging, handleDragOver, handleDrop,
    handleProcesarSubida, handleReset, handleBorradoNuclear, handleBorrarCancion, saveGenero, saveArtista, saveAlbum, handleEditarTitulo
  } = useManualUpload();

  return (
    <div className="music-tab active">
      <style>{`
        .staging-scroll::-webkit-scrollbar { width: 6px; }
        .staging-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .staging-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .staging-scroll::-webkit-scrollbar-thumb:hover { background: #2CC295; }
      `}</style>

      <div className="grid-2-cols" style={{ display: 'flex', gap: '25px', alignItems: 'stretch' }}>

        {/* --- PANEL IZQUIERDO --- */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0 }}>
          <h3>1. Definir contexto</h3>
          <form id="formMetadata">
            <label>Género Musical</label>
            <div className="input-group-row compact">
              <select value={genreId} onChange={(e) => setGenreId(e.target.value)} disabled={isLocked}>
                <option value="">Selecciona Género</option>
                {generos.map(g => <option key={g.id_gener} value={g.id_gener}>{g.nombre_genero}</option>)}
              </select>
              <button type="button" className="btn-icon" onClick={() => setActiveModal('genero')} disabled={isLocked}><i className="bi bi-plus"></i></button>
            </div>

            <label>Artista</label>
            <div className="input-group-row compact">
              <select value={artistId} onChange={(e) => setArtistId(e.target.value)} disabled={!genreId || isLocked}>
                <option value="">{genreId ? 'Selecciona Artista' : 'Elige género primero'}</option>
                {artistas.map(a => <option key={a.id_artista} value={a.id_artista}>{a.nombre}</option>)}
              </select>
              <button type="button" className="btn-icon" onClick={() => setActiveModal('artista')} disabled={!genreId || isLocked}><i className="bi bi-plus"></i></button>
            </div>

            <label>Álbum / EP</label>
            <div className="input-group-row compact">
              <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} disabled={!artistId || isLocked}>
                <option value="">{artistId ? 'Selecciona Álbum' : 'Elige artista primero'}</option>
                {albums.map(al => <option key={al.id_album} value={al.id_album}>{al.titulo_album}</option>)}
              </select>
              <button type="button" className="btn-icon" onClick={() => { setFormAlb({ titulo: '', fecha: '', tipo: 'ALBUM', num: 0, coverFile: null }); setIsEditing(false); setActiveModal('album'); }} disabled={!artistId || isLocked}><i className="bi bi-plus"></i></button>
            </div>

            {albumActual && (
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <img src={albumActual.imagen_url || "https://placehold.co/400x400?text=Sin+Portada"} alt="Cover" style={{ maxWidth: '150px', borderRadius: '8px', border: '2px solid #222' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="button" className={`btn-secondary ${isLocked ? 'btn-success' : ''}`} onClick={() => setIsLocked(!isLocked)} style={{ flexGrow: 1, backgroundColor: isLocked ? '#2CC295' : 'rgba(255,255,255,0.1)', color: isLocked ? '#000' : '#fff' }}>
                <i className={`bi ${isLocked ? 'bi-check-circle-fill' : 'bi-lock-fill'}`}></i> {isLocked ? 'Fijado' : 'Confirmar Contexto'}
              </button>
              <button type="button" className="btn-nuclear" onClick={handleReset} title="Limpiar todo">
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </form>

          {/* INVENTARIO DE CANCIONES */}
          {albumActual && (
            <div className="animate__animated animate__fadeIn" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h6 style={{ color: '#27ae60', textTransform: 'uppercase', margin: 0, fontSize: '0.75rem', letterSpacing: '1px' }}><i className="bi bi-disc"></i> En este álbum</h6>
                  <span style={{ backgroundColor: '#111', color: '#888', border: '1px solid #444', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold' }}>{cancionesBD.length} tracks</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h4 style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>{albumActual.titulo_album}</h4>
                    <span style={{ color: '#888', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}>{albumActual.fecha_lanzamiento?.substring(0, 4) || '----'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setFormAlb({ titulo: albumActual.titulo_album, fecha: albumActual.fecha_lanzamiento, tipo: albumActual.tipo_lanzamiento, num: albumActual.num_canciones, coverFile: null }); setIsEditing(true); setActiveModal('album'); }} style={{ background: 'transparent', color: '#B3B3B3', border: '1px solid #444', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#2CC295'; e.currentTarget.style.background = 'rgba(44, 194, 149, 0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.color = '#B3B3B3'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.background = 'transparent'; }}>
                      <i className="bi bi-pencil-square"></i> Editar
                    </button>
                    <button onClick={handleBorradoNuclear} style={{ background: 'transparent', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#ff4d4d'; e.currentTarget.style.color = '#fff'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff4d4d'; }}>
                      <i className="bi bi-trash3-fill"></i> Destruir
                    </button>
                  </div>
                </div>
              </div>

              <table className="table table-dark table-sm table-hover" style={{ width: '100%', background: 'transparent' }}>
                <thead>
                  <tr style={{ color: '#888', fontSize: '0.8rem' }}>
                    <th style={{ width: '50px', textAlign: 'center' }}>#</th><th>Título</th><th style={{ width: '60px', textAlign: 'center' }}><i className="bi bi-clock"></i></th><th style={{ width: '80px', textAlign: 'center' }}><i className="bi bi-gear"></i></th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef}>
                  {cancionesBD.length === 0 ? (
                    <tr key="empty-album"><td colSpan={4} className="text-center text-muted py-3">Álbum vacío</td></tr>
                  ) : (
                    cancionesBD.map((c) => (
                      <tr key={c.idCancion}>
                        <td className="text-center text-secondary">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <i className="bi bi-list drag-handle" style={{ cursor: 'grab', color: '#666' }}></i>
                            <span className="small font-monospace">{c.numeroTrack}</span>
                          </div>
                        </td>
                        <td style={{ color: '#fff', fontWeight: 'bold' }}>{c.tituloCancion}</td>
                        <td style={{ fontFamily: 'monospace', color: '#bbb', textAlign: 'center' }}>{c.duracionCancion}</td>
                        
                        <td style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                          <i className="bi bi-pencil" 
                             style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} 
                             onMouseOver={(e) => e.currentTarget.style.color='#2CC295'} 
                             onMouseOut={(e) => e.currentTarget.style.color='#B3B3B3'} 
                             onClick={() => handleEditarTitulo(c.idCancion, c.tituloCancion)}>
                          </i>
                          <i className="bi bi-trash" 
                             style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} 
                             onMouseOver={(e) => e.currentTarget.style.color='#ff4d4d'} 
                             onMouseOut={(e) => e.currentTarget.style.color='#B3B3B3'} 
                             onClick={() => handleBorrarCancion(c.idCancion)}>
                          </i>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* --- PANEL DERECHO --- */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0, height: '100%', maxHeight: 'calc(100vh - 150px)' }}>
          <div style={{ flex: 'none' }}>
            <h3>2. Carga masiva</h3>
            <p className="instruction-text">Usa el panel de la izquierda para definir el destino.</p>
            <div className="file-upload-wrapper" style={{ marginBottom: '15px' }}>
              <input type="file" id="inputFileAudio" accept="audio/*" multiple hidden disabled={!isLocked} onChange={(e) => procesarArchivosSeleccionados(e.target.files)} />
              <label htmlFor="inputFileAudio" className="custom-file-upload" style={{ opacity: isLocked ? 1 : 0.5, cursor: isLocked ? 'pointer' : 'not-allowed', width: '100%', display: 'block', textAlign: 'center', padding: '20px', border: '2px dashed #333', borderRadius: '12px', transition: 'all 0.3s' }} onDragOver={handleDragOver} onDrop={handleDrop}>
                <i className="bi bi-cloud-arrow-up" style={{ fontSize: '32px', color: isLocked ? '#2CC295' : '#555', marginBottom: '5px', display: 'block' }}></i>
                <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>{isLocked ? "Click o arrastra tus canciones aquí" : "Bloquea el contexto para subir"}</p>
              </label>
            </div>
          </div>

          <div className="file-list-area staging-scroll" style={{ flex: 1, minHeight: '200px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflowY: 'auto' }}>
            <table className="table table-dark table-sm table-hover mb-0 align-middle" style={{ width: '100%', background: 'transparent' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#121212', zIndex: 5, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                <tr style={{ color: '#888', fontSize: '0.8rem' }}><th style={{ width: '50px', textAlign: 'center' }}>#</th><th>Título Listo para BD</th><th style={{ width: '60px', textAlign: 'center' }}><i className="bi bi-clock"></i></th><th style={{ width: '80px', textAlign: 'center' }}><i className="bi bi-gear"></i></th></tr>
              </thead>
              <tbody ref={tbodyStagingRef}>
                {stagedFiles.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted" style={{ padding: '40px 0' }}><i className="bi bi-inbox fs-3 mb-2 d-block opacity-50"></i>No hay archivos en espera</td></tr>
                ) : (
                  stagedFiles.map((file) => (
                    <tr key={file.id_temp} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="text-center text-secondary"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><i className="bi bi-list drag-handle-staged" style={{ cursor: 'grab', color: '#666' }}></i><span className="small font-monospace">{file.trackNum}</span></div></td>
                      <td style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{file.title}</td>
                      <td style={{ fontFamily: 'monospace', color: '#bbb', textAlign: 'center', fontSize: '0.85rem' }}>{file.duration.replace('.', ':')}</td>
                      <td style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                        <i className="bi bi-pencil" 
                          style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} 
                          onMouseOver={(e) => e.currentTarget.style.color = '#2CC295'} 
                          onMouseOut={(e) => e.currentTarget.style.color = '#B3B3B3'} 
                          onClick={() => editarNombreStaging(file.id_temp, file.title)}>
                        </i>
                        <i className="bi bi-x-circle-fill" 
                          style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} 
                          onMouseOver={(e) => e.currentTarget.style.color = '#ff4d4d'} 
                          onMouseOut={(e) => e.currentTarget.style.color = '#B3B3B3'} 
                          onClick={() => quitarDeStaging(file.id_temp)}>
                        </i>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ flex: 'none', marginTop: '15px' }}>
            <button className="btn-primary full-width" disabled={stagedFiles.length === 0} style={{ opacity: stagedFiles.length === 0 ? 0.5 : 1, padding: '14px', borderRadius: '10px', fontWeight: 'bold', border: 'none', background: '#2CC295', color: '#000', cursor: stagedFiles.length === 0 ? 'not-allowed' : 'pointer', width: '100%' }} onClick={handleProcesarSubida}>
              <i className="bi bi-upload" style={{ marginRight: '8px' }}></i> Procesar {stagedFiles.length} canciones
            </button>
          </div>
        </div>
      </div>

      {/* --- MODALES --- */}
      {activeModal && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <h3>{activeModal === 'genero' ? 'Nuevo Género' : activeModal === 'artista' ? 'Nuevo Artista' : isEditing ? 'Editar Álbum' : 'Nuevo Álbum'}</h3>

            {activeModal === 'genero' && (
              <>
                <input type="text" placeholder="Ej. Rock" value={formG.nombre} onChange={e => setFormG({ ...formG, nombre: e.target.value })} />
                <select value={formG.decada} onChange={e => setFormG({ ...formG, decada: e.target.value })}><option value="2020-01-01">2020s</option><option value="2010-01-01">2010s</option><option value="2000-01-01">2000s</option></select>
                <div className="modal-actions"><button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button><button className="btn-confirm" onClick={saveGenero}>Guardar</button></div>
              </>
            )}

            {activeModal === 'artista' && (
              <>
                <input type="text" placeholder="Nombre Artista" value={formArt.nombre} onChange={e => setFormArt({ ...formArt, nombre: e.target.value })} />
                <textarea placeholder="Descripción" value={formArt.desc} onChange={e => setFormArt({ ...formArt, desc: e.target.value })} />
                <div className="modal-actions"><button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button><button className="btn-confirm" onClick={saveArtista}>Guardar</button></div>
              </>
            )}

            {activeModal === 'album' && (
              <>
                <input type="text" placeholder="Título Álbum" value={formAlb.titulo} onChange={e => setFormAlb({ ...formAlb, titulo: e.target.value })} />
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#bbb', fontSize: '13px', display: 'block', marginBottom: '5px' }}>Portada del Disco</label>
                  <input type="file" accept="image/*" style={{ background: '#111', padding: '10px', borderRadius: '8px', border: '1px dashed #444', color: '#fff', width: '100%' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { setFormAlb({ ...formAlb, coverFile: e.target.files[0] }); } }} />
                </div>
                <div className="row-dates"><input type="date" value={formAlb.fecha} onChange={e => setFormAlb({ ...formAlb, fecha: e.target.value })} />
                  <input type="number"
                    placeholder="Tracks"
                    value={formAlb.num === 0 ? '' : formAlb.num}
                    onChange={e => setFormAlb({ ...formAlb, num: parseInt(e.target.value) || 0 })} />
                </div>
                <select value={formAlb.tipo} onChange={e => setFormAlb({ ...formAlb, tipo: e.target.value })}><option value="ALBUM">Álbum (LP)</option><option value="EP">EP</option><option value="SINGLE">Sencillo</option></select>
                <div className="modal-actions"><button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button><button className="btn-confirm" onClick={saveAlbum}>{isEditing ? 'Actualizar' : 'Crear'}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}