// If no localStorage Tokens
if(!window.localStorage.getItem('spotifyToken') || !window.localStorage.getItem('geniusToken')) {

	window.location.replace('https://trl-test.netlify.com'); // Redirect to entrypoint

}

// APP - THE ROCK LIST
let THE_ROCK_LIST = ( () => {

	// Main data
	const DATA = {

		// Reload APP URI (for Token refresh)
		reloadAppURI: 'https://trl-test.netlify.com',

		// Spotify API data
		spotifyAPI: {
			searchURI: 		'https://api.spotify.com/v1/search?limit=12',
			getTrackURI: 	'https://api.spotify.com/v1/tracks/',
			options: 		{ headers: { Authorization: `Bearer ${window.localStorage.getItem('spotifyToken')}` } }
		},

		/*// Genius API data (not working - CORS error)
		geniusAPI: {
			searchURI: 'https://api.genius.com/search?per_page=10&page=1&q=',
			options: 		{ headers: { Authorization: `Bearer ${window.localStorage.getItem('geniusToken')}` } }
		},*/
		
		// Genius API data (working - token as get parameter, no fetch options)
		geniusAPI: {
			searchURI: 
				`https://api.genius.com/search
					?text_format=plain
					&sort=popularity
					&per_page=50
					&page=1
					&access_token=${window.localStorage.getItem('geniusToken')}
					&q=`
		},

		// Fallback image URI
		fallbackImageURI: 'https://dummyimage.com/128x128/cccccc/000000&text=♪'

	};

	// DOM references
	const DOM = {
		trackResultsList: null,
		artistResultsList: null,
		albumResultsList: null
	};
  
	// Temp variables
	const TEMP = {

		lastSearch: 					null, // EVENT_LISTENERS.searchSubmit(event) adds this value
		pickedResultJSONData: null 	// EVENT_LISTENERS.pickResult(event) adds these values

	};

	// Helper functions
	const HELPERS = {

		fetchURI(uri, options = {}) {

			// Return fetch promise or refresh Access Token
			return window.fetch(uri, options).then(response => {
		
				if(response.status === 401) {

					alert('Tu hora de acceso ha caducado. Vamos a renovarla...');

					window.location.replace(DATA.reloadAppURI);

				}
				
				else return response.json();
			
			});
		
		}

	};



	// Event listeners
	const EVENTS = {

		// Spotify search form submit (button click)
		searchSubmit(event) {

			event.preventDefault(); // Avoid page reload
		
			let userInput = event.target.elements['spotify-search-input'].value; // Get user input

			if(userInput && userInput !== TEMP.lastSearch) {

				TEMP.lastSearch = userInput;

				let options = DATA.spotifyAPI.options;

				let uri;

				for(let type of ['track', 'artist', 'album']) {

					uri = DATA.spotifyAPI.searchURI + `&type=${type}&q=${type}:${userInput}`;

					HELPERS.fetchURI(uri, options).then(results => displayResults(results));

				}

			}

		},

		// Track result pick (mousedown event)
		pickResult(event) {

			let target = event.target;
			
			while(target.parentElement) {
				
				if(target.className === 'spotify-result' && target.parentElement.id === 'spotify-track-results-list') {
					
					TEMP.pickedResultJSONData = target.dataset.spotify;
					
					break;
					
				}
				
				target = target.parentElement;
				
			}

		},

		// Track result drop (mouseup event)
		dropResult(event) {

			if(TEMP.pickedResultJSONData) {
			
				let target = event.target;
				
				while(target.parentElement) {
					
					if(target.id === 'user-list') {
					
						let droppedResult = document.createElement('li');
						
						droppedResult.setAttribute('data-spotify', TEMP.pickedResultJSONData);
						droppedResult.textContent = TEMP.pickedResultJSONData.title;
						
						target.appendChild(droppedResult);
						
						TEMP.pickedResultJSONData = null;
						
						break;
					
					}
					
					target = target.parentElement;
					
				}
			
			}

		},

		// User track click
		clickUserTrack(event) {

			let target = event.target;
	
			if(target.parentElement.id === 'user-list') {
				
				let userTrackData = JSON.parse(target.dataset.spotify);
			
				// Get Genius search URI
				let uri = DATA.geniusAPI.searchURI + `${userTrackData.title} ${userTrackData.artists.join(' ')}`;
				// let options = DATA.geniusAPI.options; // Genius API data options (not working, CORS error)
				
				// Log search response
				HELPERS.fetchURI(uri).then(response => console.log(response)).catch(error => alert(error));
					
				//
				HELPERS.fetchURI(userTrackData.href, DATA.spotifyAPI.options).then(response => console.log(response)).catch(error => alert(error));
			
			}

		}

	};



	// DISPLAY_RESULTS
	const displayResults = results => {

		let list; // Reusable list (add items here)

		// A: If results have TRACK OBJECTS
		if(results.tracks) {

			// If not empty array, add tracks to list
			if(results.tracks.items.length) {

				list = ''; // Reset list

				// Store track data - Tracks don't have images, so we set imageUri to fallbackImageURI
				let trackData = { imageURI: DATA.fallbackImageURI };

				// Loop track results
				for(let track of results.tracks.items) {
					
					// Get track data
					trackData.href 			= track.href;
					trackData.artists 	= track.artists.map(artist => artist.name);
					trackData.title 		= track.name;
					trackData.albumType = track.album.album_type === 'compilation' ? 'recopilatorio'	: track.album.album_type;
					trackData.album 		= track.album.name;

					// Add track to list - set <li> item data-spotify attribute to JSON trackData string
					list += `<li class="spotify-result" data-spotify="${JSON.stringify(trackData)}">
											<img src="${trackData.imageURI}" alt="Music Note" />
											<div>
												<h5 class="spotify-result-info pos-top">${trackData.artists.join(' | ')}</h5>
												<h4 class="spotify-result-info pos-mid">${trackData.title}</h4>
												<h6 class="spotify-result-info pos-bot">Del ${trackData.albumType} 
													<span>${trackData.album}</span>
												</h6>
											</div>
									</li>`;console.log(JSON.stringify(trackData));

				}

			}

			// If empty array, add "NO TRACK RESULTS" message to list
			else list = '<li class="spotify-no-results">Pues no, no tenemos ese tema</li>';

			DOM.trackResultsList.innerHTML = list; 	// Show list (replace old one)
			DOM.trackResultsList.scrollTop = 0; 	// Reset list scroll to top

		}

		// B: If results have ARTIST OBJECTS
		else if(results.artists) {

			// If not empty array, add artists to list
			if(results.artists.items.length) {

				list = ''; // Reset list
				
				// Store artist data
				let artistData = {};

				// Loop ertist results
				for(let artist of results.artists.items) {
					
					// Get artist data
					artistData.href 			= artist.href;
					artistData.imageURI 	= artist.images.length ? artist.images[0].url : DATA.fallbackImageURI; // Get biggest image
					artistData.popularity = artist.popularity;
					artistData.name 			= artist.name;
					artistData.genres 		= artist.genres.length ? artist.genres : ['Ninguno'];

					// Add artist to list - set <li> item data-spotify attribute to JSON artistData string
					list += `<li class="spotify-result" data-spotify="${JSON.stringify(artistData)}">
											<img src="${artistData.imageURI}" alt="Artist Image" />
											<div>
												<h5 class="spotify-result-info pos-top">Popularidad: ${artistData.popularity}%</h5>
												<h4 class="spotify-result-info pos-mid">${artistData.name}</h4>
												<h6 class="spotify-result-info pos-bot">Estilo: 
													<span>${artistData.genres.join(' | ')}</span>
												</h6>
											</div>
									</li>`;

				}

			}

			// If array is empty, add "NO ARTIST RESULTS" message to list
			else list = '<li class="spotify-no-results">Pues no, no tenemos ese artista</li>';

			DOM.artistResultsList.innerHTML = list; // Show list (replace old one)
			DOM.artistResultsList.scrollTop = 0; 	// Reset list scroll to top

		}
	
		// C: If results have ALBUM OBJECTS
		else if(results.albums) {
		
			// If not empty array, add albums to list
			if(results.albums.items.length) {
				
				list = ''; // Reset list
				
				// Store album data
				let albumData = {};

				// Loop album results
				for(let album of results.albums.items) {
					
					// Get album data
					albumData.href 				= album.href;
					albumData.imageURI 		= album.images.length ? album.images[0].url : DATA.fallbackImageURI; // Get biggest image
					albumData.artists 		= album.artists.map(artist => artist.name);
					albumData.title 			= album.name;
					albumData.type 				= album.album_type === 'compilation' ? 'recopilatorio' : album.album_type;
					albumData.releaseDate = album.release_date;

					// Add album to list - set <li> item data-spotify attribute to JSON albumData string
					list += `<li class="spotify-result" data-spotify="${JSON.stringify(albumData)}">
											<img src="${albumData.imageURI}" alt="Album Image" />
											<div>
												<h5 class="spotify-result-info pos-top">${albumData.artists.join(' | ')}</h5>
												<h4 class="spotify-result-info pos-mid">${albumData.title}</h4>
												<h6 class="spotify-result-info pos-bot">${albumData.type} &copysr; 
													<span>${albumData.releaseDate}</span>
												</h6>
											</div>
									</li>`;
					
				}

			}

			// If array is empty, display "NO ALBUM RESULTS" message
			else list = '<li class="spotify-no-results">Pues no, no tenemos ese album</li>';

			DOM.albumResultsList.innerHTML = list; 	// Show list (replace old one)
			DOM.albumResultsList.scrollTop = 0; 	// Reset list scroll to top
			
		}

	};

	return {

		initialize() {

			// Remove localStorage Tokens
			window.localStorage.removeItem('spotifyToken');
			window.localStorage.removeItem('geniusToken');

			// Get DOM references
			DOM.trackResultsList 	= document.getElementById('spotify-track-results-list');
			DOM.artistResultsList = document.getElementById('spotify-artist-results-list');
			DOM.albumResultsList 	= document.getElementById('spotify-album-results-list');

			// Set DOM events
			document.forms['spotify-search'].addEventListener('submit'		, EVENTS.searchSubmit);
			document												.addEventListener('mousedown'	, EVENTS.pickResult);
			document												.addEventListener('mouseup'		, EVENTS.dropResult);
			document												.addEventListener('click'			, EVENTS.clickUserTrack);

			document.body.style.display = 'grid'; // Show APP !!!

		}

	};

})();

// Initialize THE ROCK LIST
// document.addEventListener('DOMContentLoaded', THE_ROCK_LIST.initialize);
