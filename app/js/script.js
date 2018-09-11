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
			options: 		{ headers: { 'Authorization': `Bearer ${window.localStorage.getItem('spotifyToken')}` } }
		},

		// Genius API data
		geniusAPI: {
			searchURI: 'https://api.genius.com/search?per_page=10&page=1&q=',
			options: 		{ mode: 'cors',  headers: { 'authorization': `Bearer ${window.localStorage.getItem('geniusToken')}` } }
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

		lastSearch: 	null, 																		// EVENT_LISTENERS.searchSubmit(event) adds this value
		pickedResult: { id: null, title: null, artist: null } 	// EVENT_LISTENERS.pickResult(event) adds adds these values

	};

	// Helper functions
	const HELPERS = {

		fetchURI(uri, options) {

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

		pickResult(event) {

			let target = event.target;
			
			while(target.parentElement) {
				
				if(target.className === 'spotify-result' && target.parentElement.id === 'spotify-track-results-list') {
					
					TEMP.pickedResult.id 	= target.dataset.id;
					TEMP.pickedResult.title = target.querySelector('h4.spotify-result-info.pos-mid').textContent;
					TEMP.pickedResult.artist = target.querySelector('h5.spotify-result-info.pos-top').textContent;
					
					break;
					
				}
				
				target = target.parentElement;
				
			}

		},

		dropResult(event) {

			if(TEMP.pickedResult.id && TEMP.pickedResult.title && TEMP.pickedResult.artist) {
			
				let target = event.target;
				
				while(target.parentElement) {
					
					if(target.id === 'user-list') {
					
						let droppedResult = document.createElement('li');
						
						droppedResult.setAttribute('data-id'		, TEMP.pickedResult.id);
						droppedResult.setAttribute('data-title'	, TEMP.pickedResult.title);
						droppedResult.setAttribute('data-artist', TEMP.pickedResult.artist);
						droppedResult.textContent = TEMP.pickedResult.title;
						
						target.appendChild(droppedResult);
						
						TEMP.pickedResult.id 			= null;
						TEMP.pickedResult.title 	= null;
						TEMP.pickedResult.artist 	= null;
						
						break;
					
					}
					
					target = target.parentElement;
					
				}
			
			}

		},

		clickUserTrack(event) {

			let target = event.target;
	
			if(target.parentElement.id === 'user-list') {
			
				let uri 		= DATA.geniusAPI.searchURI + `${target.dataset.title} ${target.dataset.artist}`,
						options = DATA.geniusAPI.options;
				
				HELPERS.fetchURI(uri, options).then(result => console.log(result)).catch(error => alert(error));
			
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

				let imageSrc = DATA.fallbackImageURI; 				// Tracks don't have images, so we set image source to fallbackImageUri
				let artistNames, albumType, albumName, albumText; 	// Declare reusable variables for looping

				// Loop track results
				for(let track of results.tracks.items) {

					artistNames = track.artists.map(artist => artist.name).join(' | '); // Get artist names
					albumType 	= track.album.album_type; 								// Get track album type
					albumName 	= track.album.name; 									// Get track album name

					// Set track album text (change "compilation" for "recopilatorio" if needed)
					albumText = albumType === 'compilation' ?	`Del recopilatorio <span>${albumName}</span>` :
																`Del ${albumType} <span>${albumName}</span>`;

					// Add track to list - set <li> item data-id attribute to Spotify track id
					list += `

						<li class="spotify-result" data-id="${track.id}">

							<img src="${imageSrc}" alt="Track Image" />
							<div>
								<h5 class="spotify-result-info pos-top">${artistNames}</h5>
								<h4 class="spotify-result-info pos-mid">${track.name}</h4>
								<h6 class="spotify-result-info pos-bot">${albumText}</h6>
							</div>

						</li>

					`;

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

				list = ''; 				// Reset list

				let imageSrc, genres; 	// Declare reusable variables for looping

				// Loop ertist results
				for(let artist of results.artists.items) {

					// If artist has images, set imageSrc to max resolution image (first in array), if not, set it to fallback
					imageSrc = artist.images.length ? artist.images[0].url : DATA.fallbackImageURI;

					genres = artist.genres.join(', '); 										// Get artist genres, if any
					genres = genres ? `Estilo: <span>${genres}</span>`: 'No tiene estilo'; 	// Set artist genres or fallback

					// Add artists to list
					list += `

						<li class="spotify-result">

							<img src="${imageSrc}" alt="Artist Image" />
							<div>
								<h5 class="spotify-result-info pos-top">Popularidad:&nbsp;${artist.popularity}</h5>
								<h4 class="spotify-result-info pos-mid">${artist.name}</h4>
								<h6 class="spotify-result-info pos-bot">${genres}</h6>
							</div>

						</li>

					`;

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

				let imageSrc, artistNames, type, info; // Declare reusable variables for looping

				// Loop album results
				for(let album of results.albums.items) {

					// If album has images, set imageSrc to max resolution image (first in array), if not, set it to fallback
					imageSrc = album.images.length ? album.images[0].url : DATA.fallbackImageURI;

					artistNames = album.artists.map(artist => artist.name).join(' | '); // Get artist names

					// Get album type (change "compilation" for "recopilatorio" if needed)
					type = album.album_type === 'compilation' ? 'recopilatorio' : album.album_type;

					info = `${type} &copysr; <span>${album.release_date}</span>`; 		// Get album info

					// Add albums to list
					list += `

						<li class="spotify-result">

							<img src="${imageSrc}" alt="Album Image" />
							<div>
								<h5 class="spotify-result-info pos-top">${artistNames}</h5>
								<h4 class="spotify-result-info pos-mid">${album.name}</h4>
								<h6 class="spotify-result-info pos-bot">${info}</h6>
							</div>

						</li>

					`;
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
			DOM.artistResultsList 	= document.getElementById('spotify-artist-results-list');
			DOM.albumResultsList 	= document.getElementById('spotify-album-results-list');

			// Set DOM events
			document.forms['spotify-search'].addEventListener('submit'		, EVENTS.searchSubmit);
			document						.addEventListener('mousedown'	, EVENTS.pickResult);
			document						.addEventListener('mouseup'		, EVENTS.dropResult);
			document						.addEventListener('click'		, EVENTS.clickUserTrack);

			document.body.style.display = 'grid'; // Show APP !!!

		}

	};

})();

// Initialize THE ROCK LIST
document.addEventListener('DOMContentLoaded', THE_ROCK_LIST.initialize);
