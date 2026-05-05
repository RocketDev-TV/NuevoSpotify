'use client';
import { useYoutubeUpload } from '../../../hooks/useYoutubeUpload';

export default function YoutubeTab() {
  const {
    url, setUrl, isLoading, playlistName, setPlaylistName, albumYear, setAlbumYear,
    genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    tracks, isDownloading, progress, progressText,
    fetchMetadata, toggleTrack, updateTrackTitle, downloadSelected, resetTab,
    genres, albums, artists
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

        {/* BUSCADOR CORREGIDO */}
        <div className="input-group-row mb-4" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
          <input
            type="text"
            placeholder="https://www.youtube.com/playlist?list=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isDownloading}
            style={{ flex: '1', margin: 0, minWidth: '0' }} // minWidth evita que empuje a los botones
          />
          <button className="btn-primary" onClick={fetchMetadata} disabled={isLoading || isDownloading}
            style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
            <i className="ph ph-magnifying-glass"></i> {isLoading ? 'Buscando...' : 'Consultar'}
          </button>

          {tracks.length > 0 && !isDownloading && (
            <button className="btn-nuclear" onClick={resetTab} title="Limpiar todo"
              style={{
                margin: 0,
                whiteSpace: 'nowrap',
                fontSize: '0.85rem',
                padding: '0 20px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '110px', // Forzamos un ancho mínimo para que no se rompa
                justifyContent: 'center'
              }}>
              <i className="ph ph-trash fs-5"></i> Limpiar
            </button>
          )}
        </div>

        {tracks.length > 0 && (
          <div id="yt-preview-container" className="glass-panel animate__animated animate__fadeIn mt-4" style={{ padding: '25px' }}>

            {/* 🎵 COMBOS DE CONTEXTO (Estructura de 3 Niveles) */}
            {/* 🎵 FILA 1: GÉNERO Y ARTISTA */}
            <div className="grid-2-cols" style={{ marginBottom: '20px' }}>
              <div>
                <label>Género para la descarga</label>
                <div className="input-group-row compact">
                  <select value={genreId} onChange={(e) => setGenreId(e.target.value)}>
                    <option value="">Seleccionar Género</option>
                    {Array.isArray(genres) && genres.map((g: any, index: number) => (
                      <option key={`gen-${g.id_genero || index}`} value={g.id_gener}>
                        {g.nombre_genero}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon"><i className="ph ph-plus"></i></button>
                </div>
              </div>

              <div>
                <label>Artista (Seleccionar o crear nuevo)</label>
                <div className="input-group-row compact">
                  <select
                    value={artistId}
                    onChange={(e) => setArtistId(e.target.value)}
                    disabled={!genreId} // ✅ Solo se activa si hay Género
                  >
                    <option value="">{genreId ? 'Selecciona Artista' : 'Selecciona artista primero'}</option>
                    {Array.isArray(artists) && artists.map((a: any, index: number) => (
                      <option key={`art-${a.id_artista || index}`} value={a.id_artista}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon"><i className="ph ph-plus"></i></button>
                </div>
              </div>
            </div>

            {/* 🎵 FILA 2: ÁLBUM EXISTENTE */}
            <div className="grid-2-cols" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '25px', marginBottom: '30px' }}>
              <div>
                <label>Álbum Existente (Opcional)</label>
                <div className="input-group-row compact">
                  <select
                    value={albumId}
                    onChange={(e) => setAlbumId(e.target.value)}
                    disabled={!artistId} // ✅ Solo se activa si hay Artista
                  >
                    <option value="">{artistId ? 'Nuevo Álbum (o seleccionar)' : 'Selecciona artista primero'}</option>
                    {Array.isArray(albums) && albums.map((al: any, index: number) => (
                      <option key={`alb-${al.id_album || index}`} value={al.id_album}>
                        {al.titulo_album}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-icon"><i className="ph ph-plus"></i></button>
                </div>
              </div>
              {/* Espacio vacío para mantener el grid parejo */}
              <div></div>
            </div>

            {/* TABLA CON ALINEACIÓN MILIMÉTRICA */}
            <div className="file-list-area mb-4" style={{ width: '100%', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', padding: '15px' }}>
              <table className="table table-dark table-hover table-sm align-middle mb-0" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="text-secondary" style={{ fontSize: '0.8rem', height: '45px' }}>
                    <th style={{ width: '60px', textAlign: 'center' }}><i className="ph ph-check-square-offset fs-5"></i></th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Portada</th>
                    <th style={{ textAlign: 'center' }}>Título Final en Catálogo</th>
                    <th style={{ width: '80px', textAlign: 'center' }}><i className="ph ph-clock fs-5"></i></th>
                  </tr>
                </thead>
                <tbody id="yt-results-body">
                  {tracks.map((track, idx) => (
                    <tr key={idx} className={!track.selected ? 'song-row-yt opacity-50' : 'song-row-yt'} style={{ height: '65px' }}>
                      {/* CHECK TOTALMENTE CENTRADO */}
                      <td style={{ width: '60px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={track.selected}
                          onChange={() => toggleTrack(idx)}
                          disabled={isDownloading}
                          style={{ accentColor: '#1db954', transform: 'scale(1.3)', cursor: 'pointer', margin: '0 auto', display: 'block' }}
                        />
                      </td>
                      {/* PORTADA TOTALMENTE CENTRADA */}
                      <td style={{ width: '100px', textAlign: 'center' }}>
                        <img src={track.thumbnail} alt="thumb" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', boxShadow: '0 3px 6px rgba(0,0,0,0.4)', margin: '0 auto', display: 'block' }} />
                      </td>
                      {/* TÍTULO TOTALMENTE CENTRADO */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="text"
                          className="edit-input-yt title"
                          style={{ width: '90%', margin: '0 auto', padding: '8px 12px', fontSize: '0.9rem', borderRadius: '6px', textAlign: 'center', display: 'block' }}
                          value={track.titulo}
                          onChange={(e) => updateTrackTitle(idx, e.target.value)}
                          disabled={!track.selected || isDownloading}
                        />
                      </td>
                      {/* TIEMPO TOTALMENTE CENTRADO */}
                      <td style={{ width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className="font-monospace small" style={{ color: '#bbb' }}>{track.duracion_fmt}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ACCIÓN FINAL */}
            {!isDownloading ? (
              <button className="btn-primary full-width mt-4" onClick={downloadSelected} style={{ height: '50px', fontSize: '1rem', fontWeight: 'bold' }}>
                <i className="ph ph-rocket-launch fs-4"></i> Iniciar Descarga e Inserción en Catálogo
              </button>
            ) : (
              <div id="yt-progress-container" className="animate__animated animate__fadeIn mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="ph ph-spinner ph-spin text-success fs-4"></i>
                    <span className="text-white small fw-bold">{progressText}</span>
                  </div>
                  <span className="badge bg-success text-black fw-bold px-2 py-1">{progress}%</span>
                </div>
                <div className="progress-custom" style={{ height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, background: '#1db954', height: '100%', transition: 'width 0.4s ease' }}></div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}