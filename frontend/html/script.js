const mainDiv = document.getElementById("mainDiv");

async function switchViews(view, id = null) {
    if (!mainDiv) {
        console.error("#mainDiv not found in the base HTML.");
        return;
    }

    mainDiv.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';


    let htmlFileName = "";
    let targetElementId = "";
    let initializationFunction = null;

    switch (view) {
        case "challenges":
            htmlFileName = "challenges.html";
            targetElementId = "challengesBody";
            // initializationFunction = initializeChallengesView; // Create this function if needed
            break;
        case "communities":
            htmlFileName = "communities.html";
            targetElementId = "communitiesBody";
            // initializationFunction = initializeCommunitiesView; // Create this function if needed
            break;
        case "profile":
            htmlFileName = "profile.html";
            targetElementId = "profileBody";
             // NOTE: Profile might have sub-views ('ascents', 'saved', 'userPosts', 'userRoutes')
             // You'll need to manage how these sub-views interact or load within the profile body.
             // The 'ascents', 'saved', 'userPosts', 'userRoutes' cases below seem to target profileFeed/userFeed directly,
             // which might conflict if profile.html injects profileBody containing those IDs.
             // Re-evaluate your HTML structure and how sub-views load.
            // initializationFunction = initializeProfileView; // Create this function if needed
            break;
        case "routes":
            htmlFileName = "routes.html";
            targetElementId = "routesBody";
            initializationFunction = initializeRoutesView;
            break;
        case "settings":
            htmlFileName = "settings.html";
            targetElementId = "settingsBody";
            initializationFunction = initializeSettingsView; // Call the settings-specific JS init
            break;
        case "home":
            htmlFileName = "index.html"; // Use index.html for the home view content
            targetElementId = "homeBody"; // The ID within index.html that contains the feed/post creation form
            initializationFunction = initializeHomeView; // Call the home-specific JS init
            break;
        case "explore":
             htmlFileName = "explore.html";
             targetElementId = "exploreFeed";
            // initializationFunction = initializeExploreView; // Create this function if needed
            break;
        // Cases for sub-views that target specific areas (like profileFeed, userFeed)
        // These might need different handling if the parent view isn't already loaded
        case "ascents":
             await fetchAndInjectPartial("ascents.html", "ascentsBody", document.getElementById("profileFeed") || document.getElementById("userFeed"), initializeAscentsView);
             return;
        case "saved":
             await fetchAndInjectPartial("savedRoutes.html", "savedRoutesBody", document.getElementById("profileFeed") || document.getElementById("userFeed"), initializeSavedRoutesView);
             return;
         case "userPosts":
             await fetchAndInjectPartial("userPosts.html", "userPosts", document.getElementById("userFeed") || document.getElementById("profileFeed"), initializeUserPostsView);
             return;
        case "userRoutes":
             await fetchAndInjectPartial("userRoutes.html", "userRoutes", document.getElementById("userFeed") || document.getElementById("profileFeed"), initializeUserRoutesView);
             return;
        case "singleRoute":
            htmlFileName = "singleRoute.html";
            targetElementId = "singleRouteBody";
            initializationFunction = () => initializeSingleRouteView(id);
            break;
        case "post":
            htmlFileName = "postRoute.html";
            targetElementId = "postBody";
            initializationFunction = initializePostRouteView;
            break;
        case 'singleCommunity': // Case for viewing a single community
            htmlFileName = 'singleCommunity.html'; // Use singleCommunity.html
            targetElementId = 'singleCommunityBody'; // <-- Use the ID in singleCommunity.html
            // Note: initializeSingleCommunityView will use the 'id' parameter (community ID)
            break;


        default:
             mainDiv.innerHTML = '<p class="text-center text-red-500">View not found.</p>';
            console.error("Unknown view:", view);
            return;
    }

    await fetch(htmlFileName)
        .then(response => {
             if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status} from ${htmlFileName}`);
             }
             return response.text();
        })
        .then(data => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, "text/html");
            const targetElement = doc.getElementById(targetElementId);

            if (targetElement) {
                mainDiv.innerHTML = targetElement.innerHTML;

                if (initializationFunction) {
                    initializationFunction();
                }

            } else {
                console.error(`${targetElementId} not found in fetched ${htmlFileName}`);
                 mainDiv.innerHTML = `<p class="text-center text-red-500">Error loading content for ${view}.</p>`;
            }
        })
        .catch(error => {
            console.error(`Error fetching or processing ${htmlFileName}:`, error);
             mainDiv.innerHTML = `<p class="text-center text-red-500">Error loading ${view} view.</p>`;
        });
}

async function fetchAndInjectPartial(htmlFileName, targetElementId, targetContainer, initializationFunction = null) {
     if (!targetContainer) {
         console.error(`Target container not found for ${htmlFileName}`);
         return;
     }
     targetContainer.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';

     try {
         const response = await fetch(htmlFileName);
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status} from ${htmlFileName}`);
         }
         const data = await response.text();
         const parser = new DOMParser();
         const doc = parser.parseFromString(data, "text/html");
         const targetElement = doc.getElementById(targetElementId);

         if (targetElement) {
             targetContainer.innerHTML = targetElement.innerHTML;

             if (initializationFunction) {
                 initializationFunction();
             }
         } else {
             console.error(`${targetElementId} not found in fetched ${htmlFileName}`);
             targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
         }
     } catch (error) {
         console.error(`Error fetching or processing ${htmlFileName}:`, error);
         targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
     }
}


function initializeHomeView() {
    console.log("Initializing Home View...");
    const postsContainer = document.getElementById('postsFeedContainer');
    const postCreationArea = document.getElementById('postCreationArea');

    if (!postsContainer) {
         console.error("Posts feed container (#postsFeedContainer) not found in Home View!");
         return;
    }

    const postTextarea = document.getElementById('postContent');
    const postPhotoButton = document.getElementById('postPhotoButton');
    const postImageUploadInput = document.getElementById('postImageUpload');
    const postImagePreview = document.getElementById('postImagePreview');
    const postFileSelectedName = document.getElementById('postFileSelectedName');
    const createPostButton = document.getElementById('createPostButton');

    const fetchPosts = async () => {
        postsContainer.innerHTML = '<p class="text-center text-gray-500">Loading posts...</p>';

        try {
            const backendPostsUrl = 'http://localhost:3000/post/';

            const response = await fetch(backendPostsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (response.ok) {
                const posts = await response.json();
                console.log('Fetched posts:', posts);
                renderPosts(posts);
            } else if (response.status === 401) {
                console.error('Authentication failed fetching posts. Token expired or invalid.');
                postsContainer.innerHTML = '<p class="text-red-500 text-center">Session expired. Please log in again.</p>';
                 setTimeout(() => {
                     alert('Session expired. Please log in again.');
                     window.location.href = 'login.html';
                 }, 100);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error fetching posts.' }));
                 console.error('Failed to fetch posts:', response.status, errorData);
                 postsContainer.innerHTML = `<p class="text-red-500 text-center">Error loading posts: ${errorData.message || 'Could not fetch posts.'}</p>`;
            }

        } catch (error) {
            console.error('Network error fetching posts:', error);
             postsContainer.innerHTML = `<p class="text-red-500 text-center">Network error loading posts. Please check your connection and the server.</p>`;
        }
    };

    const renderPosts = (posts) => {
         if (!postsContainer) {
             console.error("Posts container not found for rendering in Home View!");
             return;
         }
        postsContainer.innerHTML = '';

        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = '<p class="text-gray-500 text-center">No posts yet. Be the first to share your climbing experience!</p>';
            return;
        }

        posts.forEach(post => {
             const postElement = document.createElement('div');
             postElement.classList.add('bg-white', 'rounded-lg', 'shadow-md');

             let formattedDate = post.date ? new Date(post.date).toLocaleString() : 'Unknown date';

             if (post.date) {
                const postDate = new Date(post.date);
                const now = new Date();
                const diffMs = now.getTime() - postDate.getTime();
                const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                const diffDays = Math.round(diffHours / 24);
                if (diffHours < 24) {
                    formattedDate = `${diffHours} hours ago`;
                } else {
                    formattedDate = `${diffDays} days ago`;
                }
             }

             const relativeImagePath = post.photo;

             const postImageUrl = relativeImagePath
                           ? `http://localhost:3000/images/${relativeImagePath}`
                           : null;


             const username = post.user?.username || 'Unknown User';
             const avatarUrl = post.user?.avatarUrl || 'https://via.placeholder.com/40';


             postElement.innerHTML = `
             <div class="p-4">
                 <div class="flex items-center mb-4">
                     <img
                         src="${avatarUrl}"
                         alt="${username}'s avatar"
                         class="w-10 h-10 rounded-full mr-3"
                     >
                     <div>
                         <h3 class="font-semibold">${username}</h3>
                         <p class="text-gray-500 text-sm">${formattedDate}</p>
                     </div>
                 </div>
                 <p class="mb-4">${post.title || post.content || 'No content.'}</p>
                 ${postImageUrl ? `<img src="${postImageUrl}" alt="Post image" class="w-full rounded-lg mb-4">` : ''}
                     <div>
                         <span>❤️ ${post.likes !== undefined ? post.likes : 0}</span>
                     </div>
                 </div>
             </div>
         `;

         console.log("Attempting to append post to container:", postsContainer);
        postsContainer.appendChild(postElement);
        });
    };

    const createPost = async () => {
        if (!postTextarea || !postImageUploadInput || !createPostButton) {
             console.error("Cannot create post: Missing required form elements.");
             alert("Error: Post creation form is not fully loaded.");
             return;
        }

        const content = postTextarea.value.trim();

        const photoFile = postImageUploadInput.files ? postImageUploadInput.files[0] : null;

        if (content === '' && !photoFile) {
            alert('Please add text content or select a photo to create a post.');
            return;
        }

        const formData = new FormData();
        formData.append('title', content);
        if (photoFile) {
            formData.append('photo', photoFile);
        }

        createPostButton.disabled = true;
        const originalButtonText = createPostButton.textContent;
        createPostButton.textContent = 'Posting...';

        try {
            const backendCreatePostUrl = 'http://localhost:3000/post/';

            const response = await fetch(backendCreatePostUrl, {
                method: 'POST',
                body: formData,
                headers: {},
                credentials: 'include',
            });

            if (response.ok) {
                const result = await response.json().catch(() => ({ message: 'Post created successfully (no details returned).' }));
                console.log('Post created successfully:', result);
                alert('Post created successfully!');

                postTextarea.value = '';
                if (postImageUploadInput) postImageUploadInput.value = '';
                if (postImagePreview) { postImagePreview.src = '#'; postImagePreview.classList.add('hidden'); postImagePreview.classList.remove('block'); }
                if (postFileSelectedName) { postFileSelectedName.textContent = ''; postFileSelectedName.classList.add('hidden'); }
                fetchPosts();

            } else if (response.status === 401) {
                console.error('Authentication failed creating post. Backend returned 401.');
                alert('Session expired. Please log in again.');
                window.location.href = 'login.html';
            }
             else {
                const errorData = await response.json().catch(() => ({ message: `Failed to create post. Status: ${response.status}` }));
                console.error('Failed to create post:', response.status, errorData);
                alert(errorData.message || 'Failed to create post.');
             }

        } catch (error) {
            console.error('Network error creating post:', error);
            alert('Network error. Could not connect to the server to create the post.');
        } finally {
             createPostButton.disabled = false;
             createPostButton.textContent = originalButtonText;
        }
   };



   if (!postCreationArea) {
    console.error("Post creation area (#postCreationArea) not found in Home View! Disabling post creation functionality.");
    const homeTabContent = homeBody.querySelector('.flex.mb-6');
    if (homeTabContent) homeTabContent.style.display = 'none';
    fetchPosts();
    return;
}

if (!postTextarea || !postPhotoButton || !postImageUploadInput || !postImagePreview || !postFileSelectedName || !createPostButton) {
    console.error("Some required elements *within* the post creation area were not found! Disabling post creation functionality.");
    postCreationArea.style.display = 'none';
    fetchPosts();
    return;
}

    if (createPostButton) {
        createPostButton.addEventListener('click', createPost);
    } else {
        console.error("Post button element not found in Home View!");
    }

    if (postImageUploadInput && postImagePreview && postFileSelectedName) {
        postImageUploadInput.addEventListener('change', (event) => {
            const file = event.target.files ? event.target.files[0] : null;

            if (file) {
                postFileSelectedName.textContent = `Selected: ${file.name}`;
                postFileSelectedName.classList.remove('hidden');

                const reader = new FileReader();
                reader.onload = (e) => {
                    postImagePreview.src = e.target.result;
                    postImagePreview.classList.remove('hidden');
                    postImagePreview.classList.add('block');
                };
                reader.readAsDataURL(file);

            } else {
                postFileSelectedName.textContent = '';
                postFileSelectedName.classList.add('hidden');
                postImagePreview.src = '#';
                postImagePreview.classList.add('hidden');
                postImagePreview.classList.remove('block');
            }
        });
    } else {
         console.error("Required elements for Photo Upload preview not found in Home View!");
         if (postPhotoButton) postPhotoButton.style.display = 'none';
    }


   fetchPosts();

   console.log("Home View initialization complete.");
}


function initializeSettingsView() {
    console.log("Initializing Settings View...");
    const logoutButton = document.getElementById('logoutButton');

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log("Logout button clicked.");

            // --- Clear token from sessionStorage on logout ---
            sessionStorage.removeItem('accessToken'); // Or localStorage
            // ---------------------------------------------

            try {
                const backendLogoutUrl = 'http://localhost:3000/login/logout'; // Corrected URL

                const response = await fetch(backendLogoutUrl, {
                    method: 'POST',
                    // --- You might still need credentials: 'include' here ---
                    // If your backend logout specifically clears the HttpOnly refresh token cookie,
                    // the browser needs to send it with this request.
                    credentials: "include"
                    // -----------------------------------------------------
                    // No Authorization header needed for logout endpoint itself,
                    // as backend verifyJWT would check for refreshToken cookie or header (if you changed it)
                });

                // Logout endpoint typically returns 200 or 204 on success
                if (response.ok || response.status === 204) { // Check for 204 No Content too
                    console.log('Logout successful on the server.');
                    // Token is already cleared from storage, now redirect
                    window.location.href = 'login.html';
                } else if (response.status === 401) {
                    // Even if token wasn't there, logout should ideally still work,
                    // but if it's protected by verifyJWT that expects *some* credential:
                     console.error('Logout failed or session already expired:', response.status);
                     // Token already removed, just redirect
                     alert('Session expired or logout failed.');
                     window.location.href = 'login.html';
                }
                 else {
                     // Handle other logout errors
                    const errorData = await response.json().catch(() => ({ message: 'Unknown logout error' }));
                    console.error('Logout failed on the server:', response.status, errorData);
                    alert(errorData.message || 'Logout failed.');
                 }

            } catch (error) {
                console.error('Network error during logout:', error);
                alert('Could not connect to the server to log out.');
                 // Even on network error, clear token from storage for safety
                 sessionStorage.removeItem('accessToken'); // Or localStorage
            }
        });
    } else {
        console.error("Logout button not found in Settings View!");
    }
}


function switchTab(tabValue) {
    // Logic to switch tabs within a view (like settings)
    document.querySelectorAll('[data-tab-content]').forEach(content => {
    content.classList.add('hidden');
    });

    document.querySelectorAll('[data-tab-trigger]').forEach(trigger => {
    trigger.classList.remove('bg-blue-500', 'text-white'); // Assuming blue is the active color
    // Add logic to set the active color correctly if it's not just blue/white toggle
    const activeTrigger = document.querySelector(`[data-tab-trigger="${tabValue}"]`);
     if (activeTrigger) {
         activeTrigger.classList.add('bg-blue-500', 'text-white');
     }

    });

    const targetContent = document.querySelector(`[data-tab-content="${tabValue}"]`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    } else {
        console.error(`Tab content for "${tabValue}" not found.`);
    }
}


function toggleDeleteDialog() {
const dialog = document.getElementById('delete-dialog');
 if (dialog) {
    dialog.classList.toggle('hidden');
 } else {
    console.error("Delete dialog not found!");
 }
}


document.addEventListener('DOMContentLoaded', () => {
    // Determine the initial view to load. Could be 'home' by default.
    // Or you could check the URL hash (e.g., #settings) to load a specific view on page load.
    const initialView = 'home'; // Set your desired default view
    switchViews(initialView); // Load the initial view
});


async function fetchAndInjectPartial(htmlFileName, targetElementId, targetContainer, initializationFunction = null) {
     if (!targetContainer) {
         console.error(`Target container not found for ${htmlFileName}`);
         return;
     }
     targetContainer.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';

     try {
         const response = await fetch(htmlFileName);
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status} from ${htmlFileName}`);
         }
         const data = await response.text();
         const parser = new DOMParser();
         const doc = parser.parseFromString(data, "text/html");
         const targetElement = doc.getElementById(targetElementId);

         if (targetElement) {
             targetContainer.innerHTML = targetElement.innerHTML;

             if (initializationFunction) {
                 // Pass the target container to the init function if it needs it
                 initializationFunction(targetContainer);
             }
         } else {
             console.error(`${targetElementId} not found in fetched ${htmlFileName}`);
             targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
         }
     } catch (error) {
         console.error(`Error fetching or processing ${htmlFileName}:`, error);
         targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
     }
}


function initializePostRouteView() {
    console.log("Initializing Post Route View...");

    const newRouteForm = document.getElementById('newRouteForm');
    const getLocationButton = document.getElementById('getLocationButton');
    const locationStatusSpan = document.getElementById('locationStatus');
    const geoLatitudeInput = document.getElementById('geoLatitude');
    const geoLongitudeInput = document.getElementById('geoLongitude'); 


    if (!newRouteForm || !getLocationButton || !locationStatusSpan || !geoLatitudeInput || !geoLongitudeInput) {
        console.error("Required elements for Post Route View not found!");
        return;
    }

    getLocationButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
            locationStatusSpan.textContent = 'Geolocation is not supported by your browser.';
            console.error('Geolocation not supported');
            return;
        }

        locationStatusSpan.textContent = 'Getting location...';
        getLocationButton.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => { 
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                console.log(`Location captured: Lat ${latitude}, Lon ${longitude}`);

                geoLatitudeInput.value = latitude;
                geoLongitudeInput.value = longitude;

                locationStatusSpan.textContent = `Location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                locationStatusSpan.style.color = 'green'; 
                getLocationButton.disabled = false;

            },
            (error) => {
                getLocationButton.disabled = false;

                let errorMessage = 'Error getting location.';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Geolocation permission denied. Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'The request to get user location timed out.';
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMessage = 'An unknown error occurred getting location.';
                        break;
                }
                locationStatusSpan.textContent = errorMessage;
                locationStatusSpan.style.color = 'red';
                console.error('Geolocation error:', error);

                geoLatitudeInput.value = '';
                geoLongitudeInput.value = '';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });

    newRouteForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        let submitButton = null;
        let originalButtonText = '';

        submitButton = newRouteForm.querySelector('button[type="submit"]');

         if (submitButton) {
             submitButton.disabled = true;
             originalButtonText = submitButton.textContent;
             submitButton.textContent = 'Posting Route...';
         }

        const formData = new FormData(newRouteForm);

        const latitude = formData.get('latitude');
        const longitude = formData.get('longitude');

        if (!latitude || !longitude) {
             alert('Please get your current location using the button.');
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
             }
             return;
        }

        const backendCreateRouteUrl = 'http://localhost:3000/route/';

        try {
            const response = await fetch(backendCreateRouteUrl, {
                method: 'POST',
                body: formData,
                headers: {},
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json().catch(() => ({}));
                console.log('Route created successfully:', result);
                alert('Route created successfully!');
                newRouteForm.reset();
                locationStatusSpan.textContent = '';
                locationStatusSpan.style.color = '';
                switchViews('routes');

            } else if (response.status === 401) {
                 console.error('Authentication failed creating route. Token expired or invalid.');
                 sessionStorage.removeItem('accessToken');
                 alert('Session expired. Please log in again.');
                 window.location.href = 'login.html';
            }
             else {
                 const errorData = await response.json().catch(() => ({ message: `Failed to create route. Status: ${response.status} ${response.statusText}` }));
                 console.error('Failed to create route:', response.status, errorData);
                 alert(errorData.message || 'Failed to create route.');
              }

        } catch (error) {
            console.error('Network error creating route:', error);
            alert('Network error. Could not connect to the server to create the route.');
        } finally {
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
             }
        }
    });

    console.log("Post Route View initialization complete.");
}


function initializeRoutesView() {
    console.log("Initializing Routes View...");

    // Get reference to the container where routes will be listed (using the new ID)
    const routesGridContainer = document.getElementById('routesGridContainer');

    // Check if the essential container element is found
    if (!routesGridContainer) {
        console.error("Routes grid container element not found in Routes View!");
        // You might want to display an error message to the user
        return; // Stop initialization if the container is missing
    }

    // ======================================================= //
    // Helper Functions specific to Routes View (defined inside) //
    // ======================================================= //

    // --- Function to Fetch Routes from the Backend ---
    // This function calls the backend GET /route/ endpoint
    const fetchRoutes = async () => {
        routesGridContainer.innerHTML = '<p class="text-center text-gray-500">Loading routes...</p>'; // Show loading state inside the grid container

        // Determine sorting and pagination parameters
        const sortParam = 'recent'; // Fetch the most recent routes
        const limitParam = 9; // Example: fetch 9 routes per page (fits nicely in a 3-column grid)
        const pageParam = 1; // Start with the first page

        const backendRoutesUrl = `http://localhost:3000/route/?sort=${sortParam}&limit=${limitParam}&page=${pageParam}`; // <<<--- Update Base URL

        try {
            const response = await fetch(backendRoutesUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            // --- Handle the response ---
            if (response.ok) { // Status 200-299 indicates success
                const routes = await response.json();
                console.log('Fetched routes:', routes);
                renderRoutes(routes); // Call function to display the routes
            } else if (response.status === 401) {
                // --- Handle 401: Authentication Failed (If backend requires auth for GET /route) ---
                 console.error('Authentication failed fetching routes. Token cookie missing or invalid.');
                 sessionStorage.removeItem('accessToken'); // Clear frontend state
                 alert('Session expired. Please log in again.');
                 window.location.href = 'login.html'; // Redirect to login page
                 // -------------------------------------------------------------------------------
            }
             else {
                // Handle other API errors (e.g., 400 Bad Request, 500 Internal Server Error)
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch routes. Status: ${response.status}` }));
                console.error('Failed to fetch routes:', response.status, errorData);
                routesGridContainer.innerHTML = `<p class="text-red-500 text-center">Error loading routes: ${errorData.message || 'Could not fetch routes.'}</p>`; // Display error inside the grid
             }

        } catch (error) {
            // Handle network errors (server not running, connection issues)
            console.error('Network error fetching routes:', error);
            routesGridContainer.innerHTML = `<p class="text-red-500 text-center">Network error loading routes. Please try again.</p>`; // Display error inside the grid
        }
    };

    // --- Function to Render Routes in the HTML ---
    // This function takes the array of route data and displays it in the grid container
    const renderRoutes = (routes) => {
         if (!routesGridContainer) {
             console.error("Routes grid container not found for rendering!");
             return;
         }
        routesGridContainer.innerHTML = ''; // Clear loading state or previous routes (removes hardcoded examples)

        if (!routes || routes.length === 0) {
            routesGridContainer.innerHTML = '<p class="text-gray-500 text-center col-span-full">No routes found yet.</p>'; // col-span-full makes text span all columns in grid
            return;
        }

        routes.forEach(route => {
            const routeElement = document.createElement('div');
            routeElement.classList.add('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'shadow-md', 'overflow-hidden');
            const relativeImagePath = (route.images && Array.isArray(route.images) && route.images.length > 0)
                                 ? route.images[0]
                                 : null;

            const imageUrl = relativeImagePath
                       ? `http://localhost:3000/images/${relativeImagePath}` // Prepend backend URL + static path
                       : 'https://via.placeholder.com/600x400?text=No+Image';

            routeElement.innerHTML = `
                <img src="${imageUrl}" alt="${route.title || 'Climbing Route'}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-xl font-semibold">${route.title || 'Untitled Route'}</h3>
                        
                        <span class="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded">${route.difficultyLevel || 'N/A'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${route.latitude + route.longitude || 'Location N/A'}
                    </div>
                    <p class="text-gray-700 mb-4">${route.description ? route.description.substring(0, 100) : 'No description.'}</p>

                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                            <span class="text-gray-600">❤️ ${route.likes !== undefined ? route.likes : 0} Likes</span>
                        </div>
                        <div class="flex space-x-1">
                             ${route.tags && Array.isArray(route.tags) ? route.tags.map(tag => `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${tag}</span>`).join('') : ''}
                        </div>
                    </div>
                    <a href="#" onclick="switchViews('singleRoute', '${route._id}')" class="text-blue-500 hover:underline text-sm mt-2 inline-block">View Details</a>
                </div>
            `;

            routesGridContainer.appendChild(routeElement);
        });
    };

    fetchRoutes();
}


function initializeSingleRouteView(routeId) {
    console.log("Initializing Single Route View for ID:", routeId);

    if (!routeId) {
        console.error("No route ID provided for single route view!");
        const singleRouteBody = document.getElementById('singleRouteBody');
        if (singleRouteBody) {
            singleRouteBody.innerHTML = '<p class="text-center text-red-500">Error: Route ID missing.</p>';
        }
        return;
    }

    const singleRouteImage = document.getElementById('singleRouteImage');
    const singleRouteTitle = document.getElementById('singleRouteTitle');
    const singleRouteLocation = document.getElementById('singleRouteLocation');
    const singleRouteGrade = document.getElementById('singleRouteGrade');
    const singleRouteDescription = document.getElementById('singleRouteDescription');
    const singleRouteStyle = document.getElementById('singleRouteStyle');
    const singleRouteRating = document.getElementById('singleRouteRating');
    const singleRouteAscentCount = document.getElementById('singleRouteAscentCount');
    const singleRouteFeatures = document.getElementById('singleRouteFeatures');
    const singleRouteFeaturesSection = document.getElementById('singleRouteFeaturesSection');


    const singleRouteBetaFeaturesSection = document.getElementById('singleRouteBetaFeatures');
    const singleRouteAscentsSection = document.getElementById('singleRouteAscents');
    const singleRouteNearbyRoutesSection = document.getElementById('singleRouteNearbyRoutes');


    if (singleRouteTitle) singleRouteTitle.textContent = 'Loading Route...';
    if (singleRouteLocation) singleRouteLocation.textContent = 'Loading location...';
    if (singleRouteGrade) singleRouteGrade.textContent = 'Loading...';
    if (singleRouteDescription) singleRouteDescription.textContent = 'Loading description...';
    if (singleRouteStyle) singleRouteStyle.textContent = 'Loading...';
    if (singleRouteRating) singleRouteRating.textContent = 'N/A';
    if (singleRouteAscentCount) singleRouteAscentCount.textContent = '(Loading ascents...)';



    const likeRouteButton = document.getElementById('likeRouteButton');

    const fetchRouteDetails = async (id) => {

        const backendRouteUrl = `http://localhost:3000/route/${id}`;

        try {

            const response = await fetch(backendRouteUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // --- Include Authorization header if your GET /route/:id endpoint is protected ---
                    // Check your backend routes/route.js - is verifyJWT middleware used for GET /:id?
                    // 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` // Or localStorage
                },

                credentials: 'include'
            });


            if (response.ok) {
                const route = await response.json();
                console.log('Fetched single route details:', route);
                renderRouteDetails(route);

                // --- Handle like button state and event listener after fetching route ---
                if (likeRouteButton) {
                    // You'll need to know if the current logged-in user has liked this route
                    // This might require fetching the user's liked routes or adding a field to the single route response
                    // For now, let's just add the click listener
                    likeRouteButton.onclick = () => handleLikeUnlike(routeId, likeRouteButton); // Add click handler, pass routeId and button
                }
                // -----------------------------------------------------------------------

            } else if (response.status === 404) {
                 console.error('Route not found:', id);
                 if (singleRouteTitle) singleRouteTitle.textContent = 'Route Not Found';
                 if (singleRouteLocation) singleRouteLocation.textContent = ''; // Clear other fields
                 if (singleRouteGrade) singleRouteGrade.textContent = '';
                 if (singleRouteImage) singleRouteImage.src = 'https://d3byf4kaqtov0k.cloudfront.net/p/news/syxpy5yl.webp';
                 if (singleRouteDescription) singleRouteDescription.textContent = 'The requested route could not be found.';
                 // Hide sections that rely on route data
                 if (singleRouteBetaFeaturesSection) singleRouteBetaFeaturesSection.classList.add('hidden');
                 if (singleRouteAscentsSection) singleRouteAscentsSection.classList.add('hidden');
                 if (singleRouteFeaturesSection) singleRouteFeaturesSection.classList.add('hidden');
                 if (singleRouteNearbyRoutesSection) singleRouteNearbyRoutesSection.classList.add('hidden');
                 if (likeRouteButton) likeRouteButton.style.display = 'none'; // Hide like button

            } else if (response.status === 401) {
                // --- Handle 401: Authentication Failed (If backend GET /route/:id requires auth) ---
                 console.error('Authentication failed fetching route details. Redirecting to login.');
                 sessionStorage.removeItem('accessToken'); // Clear invalid token
                 alert('Session expired. Please log in again.');
                 window.location.href = 'login.html'; // Redirect
                 // ---------------------------------------------------------------------------------
            }
             else {
                // Handle other API errors
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch route details. Status: ${response.status}` }));
                 console.error('Failed to fetch route details:', response.status, errorData);
                 if (singleRouteTitle) singleRouteTitle.textContent = 'Error Loading Route';
                 if (singleRouteDescription) singleRouteDescription.textContent = errorData.message || 'Could not load route details.';
                 // Hide other sections on error
                 if (singleRouteImage) singleRouteImage.src = 'https://via.placeholder.com/800x400?text=Error';
                 if (singleRouteLocation) singleRouteLocation.textContent = '';
                 if (singleRouteGrade) singleRouteGrade.textContent = '';
                 if (singleRouteStyle) singleRouteStyle.textContent = '';
                 if (singleRouteRating) singleRouteRating.textContent = '';
                 if (singleRouteAscentCount) singleRouteAscentCount.textContent = '';
                 if (singleRouteBetaFeaturesSection) singleRouteBetaFeaturesSection.classList.add('hidden');
                 if (singleRouteAscentsSection) singleRouteAscentsSection.classList.add('hidden');
                 if (singleRouteFeaturesSection) singleRouteFeaturesSection.classList.add('hidden');
                 if (singleRouteNearbyRoutesSection) singleRouteNearbyRoutesSection.classList.add('hidden');
                 if (likeRouteButton) likeRouteButton.style.display = 'none'; // Hide like button

             }

        } catch (error) {
            // Handle network errors
            console.error('Network error fetching route details:', error);
            if (singleRouteTitle) singleRouteTitle.textContent = 'Network Error';
            if (singleRouteDescription) singleRouteDescription.textContent = 'Could not connect to the server to load route details.';
            // Hide other sections on network error
             if (singleRouteImage) singleRouteImage.src = 'https://via.placeholder.com/800x400?text=Network+Error';
             if (singleRouteLocation) singleRouteLocation.textContent = '';
             if (singleRouteGrade) singleRouteGrade.textContent = '';
             if (singleRouteStyle) singleRouteStyle.textContent = '';
             if (singleRouteRating) singleRouteRating.textContent = '';
             if (singleRouteAscentCount) singleRouteAscentCount.textContent = '';
             if (singleRouteBetaFeaturesSection) singleRouteBetaFeaturesSection.classList.add('hidden');
             if (singleRouteAscentsSection) singleRouteAscentsSection.classList.add('hidden');
             if (singleRouteFeaturesSection) singleRouteFeaturesSection.classList.add('hidden');
             if (singleRouteNearbyRoutesSection) singleRouteNearbyRoutesSection.classList.add('hidden');
             if (likeRouteButton) likeRouteButton.style.display = 'none'; // Hide like button
        }
    };

    const renderRouteDetails = (route) => {

        if (singleRouteTitle) singleRouteTitle.textContent = route.title || 'Untitled Route';

        if (singleRouteImage) {
            const relativeImagePath = (route.images && Array.isArray(route.images) && route.images.length > 0)
                                  ? route.images[0]
                                  : null;

        const imageUrl = relativeImagePath
                       ? `http://localhost:3000/images/${relativeImagePath}`
                       : 'https://via.placeholder.com/800x400?text=No+Image';
            singleRouteImage.src = imageUrl;
            singleRouteImage.alt = route.title || 'Climbing Route';
        }

        if (singleRouteLocation) {
             if (route.latitude !== undefined && route.longitude !== undefined) {
                 singleRouteLocation.textContent = `Coordinates: ${parseFloat(route.latitude).toFixed(4)}, ${parseFloat(route.longitude).toFixed(4)}`;
             } else if (route.geoLocation && route.geoLocation.latitude !== undefined && route.geoLocation.longitude !== undefined) {
                 // Fallback if geoLocation object was projected instead of individual lat/lon
                 singleRouteLocation.textContent = `Coordinates: ${parseFloat(route.geoLocation.latitude).toFixed(4)}, ${parseFloat(route.geoLocation.longitude).toFixed(4)}`;
             }
             else {
                 // If you stored a location text field in the backend and projected it:
                 // singleRouteLocation.textContent = route.locationText || 'Location N/A';
                  singleRouteLocation.textContent = 'Location N/A'; // Default if coordinates/text missing
             }
        }


        // Grade (using climbType and difficultyLevel from the GET /route/:id projection)
        if (singleRouteGrade) {
            if (route.climbType || route.difficultyLevel) {
                 singleRouteGrade.textContent = `${route.climbType || ''}${(route.climbType && route.difficultyLevel) ? ' / ' : ''}${route.difficultyLevel || ''}`;
                 // Optional: Change background color based on climbType or difficulty
                 // Example: singleRouteGrade.classList.add('bg-red-500', 'text-white');
            } else {
                 singleRouteGrade.textContent = 'N/A';
            }
        }

        // Style (using climbType)
        if (singleRouteStyle) {
             singleRouteStyle.textContent = route.climbType || 'N/A';
        }

        // Description
        if (singleRouteDescription) singleRouteDescription.textContent = route.description || 'No description available.';

        // Likes / Ascent Count (assuming 'likes' is total likes, not average rating)
        if (singleRouteRating) {
             // If 'likes' from backend is total likes:
             singleRouteRating.textContent = route.likes !== undefined ? route.likes : 0;
             // If you have an average rating field projected, use that here

             // Update ascent count (assuming 'climbedCount' is projected for total ascents)
             if (singleRouteAscentCount) {
                 if (route.climbedCount !== undefined) {
                      singleRouteAscentCount.textContent = `(${route.climbedCount} ascents)`;
                 } else {
                     singleRouteAscentCount.textContent = '(Ascent count N/A)';
                 }
             } else if (route.likes !== undefined && singleRouteAscentCount) {
                 // If 'likes' is being used for ascent count display
                  singleRouteAscentCount.textContent = `(${route.likes} ascents)`;
             } else if (singleRouteAscentCount) {
                 singleRouteAscentCount.textContent = '(Ascent count N/A)';
             }
        }


        // Tags / Features (assuming 'tags' array is projected)
        if (singleRouteFeatures && singleRouteFeaturesSection) {
            if (route.tags && Array.isArray(route.tags) && route.tags.length > 0) {
                singleRouteFeatures.innerHTML = route.tags.map(tag =>
                    `<span class="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm">${tag}</span>`
                ).join('');
                singleRouteFeaturesSection.classList.remove('hidden'); // Show the section
            } else {
                singleRouteFeaturesSection.classList.add('hidden'); // Hide the section if no tags
            }
        }

        // Beta Points - This requires specific data structure in the backend (e.g., an array of strings for beta points)
        // If you add a 'betaPoints' array field to your Route model and project it:
        const singleRouteBetaList = document.getElementById('singleRouteBetaList');
         if (singleRouteBetaList && singleRouteBetaFeaturesSection) {
             if (route.betaPoints && Array.isArray(route.betaPoints) && route.betaPoints.length > 0) {
                  singleRouteBetaList.innerHTML = route.betaPoints.map(betaPoint =>
                      `<li class="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check text-green-500 mr-2 mt-1">
                              <path d="M20 6 9 17l-5-5"></path>
                          </svg>
                          ${betaPoint}
                      </li>`
                  ).join('');
                  singleRouteBetaFeaturesSection.classList.remove('hidden'); // Show the section
             } else {
                  singleRouteBetaFeaturesSection.classList.add('hidden'); // Hide the section
             }
         }


        // Ascents List - This requires fetching and rendering a list of ascent records for this route (likely a separate endpoint/logic)
        // For now, the section is hidden by default in HTML


        // Nearby Routes - This requires a separate backend endpoint to find nearby routes and frontend rendering logic
        // For now, the section is hidden by default in HTML


        // Show the main content body once details are loaded (if it was hidden initially)
        // const singleRouteBody = document.getElementById('singleRouteBody');
        // if(singleRouteBody) singleRouteBody.classList.remove('hidden');
    };
    // ======================================================= //
    // End of Helper Functions specific to Single Route View //
    // ======================================================= //


    // --- Handle Like/Unlike Button ---
    // This function will call the like/unlike backend endpoints
    const handleLikeUnlike = async (routeId, buttonElement) => {
        // Get the current state of the button (e.g., its text or a data attribute)
        const isLiking = buttonElement.textContent.includes('Like'); // Simple check based on button text

        // Get the correct backend endpoint URL
        const backendLikeUnlikeUrl = `http://localhost:3000/route/${routeId}/${isLiking ? 'like' : 'unlike'}`; // <<< Update Base URL

        // Get the access token
        const accessToken = sessionStorage.getItem('accessToken'); // Or localStorage

        if (!accessToken) {
            console.error("No access token found. User is not logged in.");
            alert('You must be logged in to like or unlike routes.');
            // Optional: redirect to login page
            // window.location.href = 'login.html';
            return;
        }

        try {
            buttonElement.disabled = true; // Disable button during request
            const originalButtonText = buttonElement.textContent;
            buttonElement.textContent = isLaking ? 'Liking...' : 'Unliking...';

            const response = await fetch(backendLikeUnlikeUrl, {
                method: 'POST', // Both like and unlike are POST requests
                headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${accessToken}` // Authenticate the request
                },
                 credentials: 'include' // Include cookies if needed for auth middleware
            });

             if (response.ok) {
                 const result = await response.json().catch(() => ({ message: `${isLiking ? 'Liked' : 'Unliked'} successfully.` }));
                 console.log(`${isLiking ? 'Like' : 'Unlike'} successful:`, result.message);
                 alert(result.message);

                 // --- Update the button state and text ---
                 buttonElement.textContent = isLiking ? 'Unlike' : 'Like';
                 // You might also want to update the likes count displayed on the page
                 // Re-fetching the route details after like/unlike is one way to update the count
                 // fetchRouteDetails(routeId); // Refetch to update details, including like count
                 // Or manually update the displayed likes count based on expected increment/decrement
                 const currentLikesElement = document.getElementById('singleRouteRating'); // Assuming rating element shows likes
                 if (currentLikesElement) {
                     let currentLikes = parseInt(currentLikesElement.textContent.replace('❤️ ', '')) || 0;
                      currentLikes += isLiking ? 1 : -1;
                      currentLikesElement.textContent = `❤️ ${currentLikes}`;
                 }
                 // ----------------------------------------

             } else if (response.status === 401) {
                 console.error('Authentication failed during like/unlike. Redirecting.');
                 sessionStorage.removeItem('accessToken');
                 alert('Session expired. Please log in again.');
                 window.location.href = 'login.html';
             } else if (response.status === 400) {
                 const errorData = await response.json().catch(() => ({ message: 'Invalid request.' }));
                 console.error('Bad request during like/unlike:', response.status, errorData);
                 alert(errorData.message || 'Failed to process like/unlike.');
             }
              else {
                 const errorData = await response.json().catch(() => ({ message: `Failed to ${isLiking ? 'like' : 'unlike'} route. Status: ${response.status}` }));
                 console.error(`Failed to ${isLiking ? 'like' : 'unlike'} route:`, response.status, errorData);
                 alert(errorData.message || `Failed to ${isLiking ? 'like' : 'unlike'} route.`);
             }

        } catch (error) {
            console.error('Network error during like/unlike:', error);
            alert('Network error. Could not connect to the server.');
        } finally {
            buttonElement.disabled = false; // Re-enable button
            buttonElement.textContent = originalButtonText; // Restore original text on failure/error
        }
    };

    fetchRouteDetails(routeId);

    console.log("Single Route View initialization complete.");
}


async function logout() {
    console.log("Logging out user...");

    // --- Optional: Clear any leftover frontend storage just in case ---
    // While authentication is primarily via HttpOnly cookies, it's good practice
    // to clear any related data that might have been stored in sessionStorage or localStorage
    // at login or elsewhere, for a clean state.
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken'); // If refresh token was ever stored here
    localStorage.removeItem('refreshToken'); // If refresh token was ever stored here
    // Clear any other user-specific data you might be storing
    sessionStorage.removeItem('userId');
    localStorage.removeItem('userId');
    // ... remove any other relevant keys ...
    // ----------------------------------------------------------

    // --- Call the backend logout endpoint ---
    // This tells your backend server to invalidate the user's session/tokens
    // and clear the HttpOnly authentication cookies.
    // !!! You need to define this backend endpoint URL !!!
    const backendLogoutUrl = 'http://localhost:3000/api/logout'; // <-- VERIFY this URL matches your backend

    try {
        const response = await fetch(backendLogoutUrl, {
            method: 'POST', // Logout is typically a POST request
            headers: {
                'Content-Type': 'application/json',
                // No need for 'Authorization: Bearer' header here,
                // because authentication for *this* endpoint relies on the browser
                // automatically sending the HttpOnly cookies.
            },
            // credentials: 'include' is CRUCIAL to ensure the browser sends the HttpOnly cookies
            credentials: 'include',
            // Typically, a logout POST request doesn't need a body, but depends on backend implementation
            // body: JSON.stringify({}), // Include a body if your backend expects one
        });

        // --- Handle the response from the backend ---
        if (response.ok) { // Backend responded with a success status (e.g., 200 OK)
            console.log("Backend logout successful. Redirecting to login page.");
            // Backend should have cleared cookies and invalidated the token
            // Now, redirect the user to the login page
            window.location.href = 'login.html';
        } else {
            // If backend logout endpoint returned an error status (e.g., 401, 500)
            console.error("Backend logout failed:", response.status, response.statusText);
            // Even if backend logout failed, we should probably still redirect
            // the user to the login page to force a re-authentication attempt.
            // The frontend storage is already cleared above.
            alert("Logout failed on the server. Please try logging in again."); // Inform the user
            window.location.href = 'login.html'; // Redirect anyway
        }

    } catch (error) {
        // Handle network errors (e.g., backend server is not running or reachable)
        console.error("Network error during logout:", error);
        alert("Network error during logout. Could not reach the server. Please check connection. Redirecting.");
        window.location.href = 'login.html'; // Redirect even on network error
    }
}


async function initializeCommunitiesView() {
    console.log("Initializing Communities View...");

    const communitiesListContainer = document.getElementById('communitiesListContainer');
    const communitySearchInput = document.getElementById('communitySearchInput');

    // Check if the container element was found in the injected HTML
    if (!communitiesListContainer) {
        console.error("Communities list container (#communitiesListContainer) not found in Communities View!");
        // Handle this error - maybe show a message in the main content area
        const mainDiv = document.getElementById('mainDiv'); // Or communitiesBody if injecting that
        if (mainDiv) mainDiv.innerHTML = '<p class="text-red-500 text-center">Error loading communities section.</p>';
        return; // Stop initialization
    }
    if (!communitySearchInput) {
        console.warn("Community search input (#communitySearchInput) not found. Search functionality disabled.");
   }

    // --- Helper function to fetch communities from the backend ---
    const fetchCommunities = async (searchTerm = '') => { // Accept optional search term
        communitiesListContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">Loading communities...</p>';

        try {
            // !!! VERIFY this URL matches your backend endpoint for getting ALL communities !!!
            const backendCommunitiesUrl = new URL('http://localhost:3000/community/'); // Use URL object to easily add search params

            // If a search term is provided and not empty, add it as a query parameter
            if (searchTerm.trim() !== '') {
                 // Assuming your backend GET /community/ endpoint supports a 'search' query parameter
                 // that filters communities by name or description.
                 // If your backend doesn't support this yet, you'll need to implement it,
                 // or rely solely on client-side filtering after fetching all communities initially.
                 // For now, let's assume backend supports ?search=...
                 backendCommunitiesUrl.searchParams.append('search', searchTerm.trim());
            }
             // Optional: Add pagination params if your backend supports them
             // backendCommunitiesUrl.searchParams.append('page', 1);
             // backendCommunitiesUrl.searchParams.append('limit', 20);


            const response = await fetch(backendCommunitiesUrl.toString(), { // Convert URL object back to string
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies
            });

            // --- Handle the response ---
            if (response.ok) { // Status 200-299 is OK
                const communities = await response.json(); // Parse JSON
                console.log('Fetched communities:', communities);
                allCommunities = communities; // Store the full list of fetched communities
                renderCommunities(allCommunities); // Render the full list
            } else if (response.status === 401) {
                 console.error('Authentication failed fetching communities. Token expired or invalid.');
                 communitiesListContainer.innerHTML = '<p class="text-red-500 text-center col-span-full">Session expired. Please log in again.</p>';
                  setTimeout(() => { alert('Session expired. Please log in again.'); window.location.href = 'login.html'; }, 100);
            }
            else {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch communities. Status: ${response.status}` }));
                console.error('Failed to fetch communities:', response.status, errorData);
                communitiesListContainer.innerHTML = `<p class="text-red-500 text-center col-span-full">Error loading communities: ${errorData.message || 'Could not fetch communities.'}</p>`;
            }

        } catch (error) {
            console.error('Network error fetching communities:', error);
             communitiesListContainer.innerHTML = `<p class="text-red-500 text-center col-span-full">Network error loading communities. Please check your connection and the server.</p>`;
        }
    };


    const renderCommunities = (communitiesToRender) => {
        if (!communitiesListContainer) {
             console.error("Communities list container not found for rendering!");
             return;
         }

        communitiesListContainer.innerHTML = ''; // Clear the container

        // If no communities are passed to render, display a message
        if (!communitiesToRender || !Array.isArray(communitiesToRender) || communitiesToRender.length === 0) {
            communitiesListContainer.innerHTML = '<p class="text-gray-500 text-center col-span-full">No communities found matching your criteria.</p>';
            return;
        }

        // Loop through the array of communities and create HTML for each one
        communitiesToRender.forEach(community => {
             const communityCardElement = document.createElement('div');
             communityCardElement.classList.add('bg-white', 'rounded-lg', 'shadow-md', 'overflow-hidden');

             const communityImageUrl = (community.image)
                                    ? `http://localhost:3000/images/${community.image}` // Prepend base URL
                                    : 'https://via.placeholder.com/300x150?text=No+Image'; // Placeholder


             const memberCount = community.memberCount !== undefined ? community.memberCount : 0;


             communityCardElement.innerHTML = `
                 <div class="h-36 bg-cover bg-center" style="background-image: url('${communityImageUrl}')"></div>
                 <div class="p-4">
                     <div class="flex justify-between items-center mb-2">
                         {/* Add onclick to switch to the single community view, passing the community ID */}
                         <button onclick="switchViews('singleCommunity', '${community._id}')"> {/* Pass the community's database ID */}
                             <h2 class="text-xl font-semibold hover:underline cursor-pointer">${community.name || 'Unnamed Community'}</h2> {/* Display community name */}
                         </button>
                         {/* Member Count */}
                         <span class="text-sm text-gray-500">${memberCount} members</span> {/* Display member count */}
                     </div>
                     {/* Community Description */}
                     <p class="text-gray-600 mb-4">${community.description || 'No description.'}</p> {/* Display community description */}

                     {/* Join/Joined Button (Logic based on user membership needed here) */}
                     <button class="w-full py-2 bg-white border rounded-md hover:bg-gray-100">Join</button> {/* Example button */}
                 </div>
             `;

            communitiesListContainer.appendChild(communityCardElement); // Append the card
        });
    };

    if (communitySearchInput) { // Only add if the element was found
        // Use 'input' event for real-time filtering as user types
        communitySearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.trim().toLowerCase();

            // --- Client-side Filtering (Simpler approach) ---
            // Filter the 'allCommunities' array based on the search term
            const filteredCommunities = allCommunities.filter(community => {
                // Check if community name or description includes the search term (case-insensitive)
                const nameMatch = community.name ? community.name.toLowerCase().includes(searchTerm) : false;
                const descriptionMatch = community.description ? community.description.toLowerCase().includes(searchTerm) : false;
                return nameMatch || descriptionMatch;
            });
            renderCommunities(filteredCommunities); // Render the filtered list

            // --- OR Server-side Filtering (Requires backend support) ---
            // Call fetchCommunities with the search term. This will re-fetch from backend.
            // fetchCommunities(searchTerm); // Uncomment this if your backend supports ?search=
        });
   }


   // --- Initial Action: Fetch and render communities when this view is loaded ---
   // This fulfills the requirement to automatically load communities.
   fetchCommunities();

    console.log("Communities View initialization complete.");
}

async function createNewCommunity() {
    console.log("Attempting to create a new community...");

    // --- Prompt user for community details (Simple approach) ---
    const communityName = prompt("Enter the name for your new community:");
    if (!communityName || communityName.trim() === '') {
        alert("Community name cannot be empty.");
        return; // Stop if name is empty
    }

    const communityDescription = prompt("Enter a brief description for your community:");
     // Description can potentially be empty based on backend validation, depending on requirements

    // Optional: Prompt or use a file input for an image if you want to include one
    // For simplicity using prompt is hard for file selection. You'd need a modal
    // with a file input similar to post creation. Let's omit image upload for now
    // in this simple prompt version.

    // --- Prepare the data to send to the backend ---
    // Since we are not including a file with prompt, we can send JSON.
    // If you add file upload, you MUST use FormData like in createPost.
    const newCommunityData = {
        name: communityName.trim(),
        description: communityDescription ? communityDescription.trim() : '', // Send description
        // No image in this simple prompt version
    };

    // --- Get token from storage if needed (If backend requires header auth) ---
    // IMPORTANT: If your backend createCommunity endpoint relies on HttpOnly cookies (via verifyJWT),
    // you DON'T need to get the token from storage or add an Authorization header.
    // The browser will send the cookies automatically with credentials: 'include'.
    // Based on your community.js router, createCommunity uses verifyJWT, so it relies on cookies.
    // Therefore, we don't need to get token from storage here.
    // const accessToken = sessionStorage.getItem('accessToken');
    // if (!accessToken) { alert("You must be logged in to create a community."); return; }
    // ------------------------------------------------------------------------

    // --- Send the data to the backend POST /community/ endpoint ---
    const backendCreateCommunityUrl = 'http://localhost:3000/community/'; // VERIFY this URL

    try {
        const response = await fetch(backendCreateCommunityUrl, {
            method: 'POST', // Use POST for creation
            // headers: { // Use headers for JSON body
            //     'Content-Type': 'application/json',
            //     // --- REMOVE Authorization header if using HttpOnly cookies ---
            //     // 'Authorization': `Bearer ${accessToken}` // REMOVE THIS
            // },
             // body: JSON.stringify(newCommunityData), // Send JSON body

            // --- Use FormData if including file upload (requires a file input UI) ---
            // For the simple prompt version without file, JSON is easier.
            // If you add file upload UI, switch back to FormData and remove JSON body/header
            // const formData = new FormData();
            // formData.append('name', newCommunityData.name);
            // formData.append('description', newCommunityData.description);
            // if (communityImageFile) { formData.append('image', communityImageFile); } // Append file if available
            // body: formData, // Use FormData

            // --- Use JSON body for the prompt-based version without file ---
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCommunityData),
            // ----------------------------------------------------------

            // --- Keep credentials: 'include' to send HttpOnly cookies ---
            credentials: 'include',
        });

        // --- Handle the backend response ---
        if (response.ok) { // Status 200-299 is OK (Backend should ideally send 201 Created)
            const result = await response.json().catch(() => ({ message: 'Community created successfully (no details returned).' }));
            console.log('Community created successfully:', result);
            alert('Community created successfully!');

            // --- Refresh the communities list to show the new community ---
            // Assuming fetchCommunities is accessible in this scope (it should be if defined higher up or globally)
            fetchCommunities(); // Re-fetch and re-render the list

        } else if (response.status === 401) {
             // --- Handle 401: Authentication Failed (Backend verifyJWT returned 401) ---
             console.error('Authentication failed creating community. Backend returned 401.');
             alert('Session expired. Please log in again.');
             window.location.href = 'login.html'; // Redirect
        } else if (response.status === 409) {
            // Handle conflict (e.g., community name already exists)
            const errorData = await response.json().catch(() => ({ message: 'Community name already exists.' }));
            console.error('Community creation conflict:', errorData.message);
            alert(errorData.message);
        }
         else {
            // Handle other API errors (e.g., 400 Bad Request from backend validation)
            const errorData = await response.json().catch(() => ({ message: `Failed to create community. Status: ${response.status}` }));
            console.error('Failed to create community:', response.status, errorData);
            alert(errorData.message || 'Failed to create community.'); // Show user an error message
         }

    } catch (error) {
        // Handle network errors (server down, connection issues)
        console.error('Network error creating community:', error);
        alert('Network error. Could not connect to the server to create the community.');
    } finally {
        // Optional: Re-enable button if you disabled it
    }
}

// You will also need to create initializeSingleCommunityView later:
/*
async function initializeSingleCommunityView(communityId) {
    console.log("Initializing Single Community View for ID:", communityId);
    // This function will fetch details for a specific community using the communityId
    // and populate the singleCommunity.html elements.
    // ... fetch community details from backend GET /community/:id ...
    // ... update title, description, members, etc. in singleCommunity.html ...
}
*/

// Ensure initializeCommunitiesView and initializeSingleCommunityView are added to your
// initializationFunctions map in the switchViews function as shown in Step 2.