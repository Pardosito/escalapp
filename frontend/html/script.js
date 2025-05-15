// This code goes into your script.js file

// Get a reference to the main content area
const mainDiv = document.getElementById("mainDiv");
// You might need references to other dynamic areas like profileFeed or userFeed as well
// const profileFeed = document.getElementById("profileFeed"); // Ensure these elements exist in your base HTML or are handled appropriately by switchViews


// --- Main function to switch between views ---
async function switchViews(view) {
    if (!mainDiv) {
        console.error("#mainDiv not found in the base HTML.");
        return; // Cannot switch views if main container is missing
    }

    // Optional: Show a loading indicator
    mainDiv.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';


    let htmlFileName = "";
    let targetElementId = "";
    let initializationFunction = null; // Function to call after injecting HTML

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
            // initializationFunction = initializeRoutesView; // Create this function if needed
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
            // Assuming profile is already loaded, target profileFeed or userFeed
             // You might need to adjust the target element based on your HTML structure
             await fetchAndInjectPartial("ascents.html", "ascentsBody", document.getElementById("profileFeed") || document.getElementById("userFeed"), initializeAscentsView);
             return; // Exit switchViews after handling
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
            // initializationFunction = initializeSingleRouteView; // Create this function if needed
            break;
        case "post": // Assuming this is for posting a new route/climb, not social post
            htmlFileName = "postRoute.html"; // Or 'createPost.html' ?
            targetElementId = "postBody";
            initializationFunction = initializePostRouteView; // Create this function if needed
            break;
        case "singleCom":
            htmlFileName = "singleCommunity.html";
            targetElementId = "singleCommunityBody";
            // initializationFunction = initializeSingleCommunityView; // Create this function if needed
            break;


        default:
             mainDiv.innerHTML = '<p class="text-center text-red-500">View not found.</p>';
            console.error("Unknown view:", view);
            return; // Exit if view is unknown
    }

    // Fetch the HTML file
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
                mainDiv.innerHTML = targetElement.innerHTML; // Inject the content

                // --- Call the initialization function AFTER injecting HTML ---
                if (initializationFunction) {
                    initializationFunction(); // Execute view-specific JS setup
                }
                // -------------------------------------------------------

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

// --- Helper function for injecting into targets other than mainDiv ---
// (Used by 'ascents', 'saved', etc. cases if they target specific areas)
async function fetchAndInjectPartial(htmlFileName, targetElementId, targetContainer, initializationFunction = null) {
     if (!targetContainer) {
         console.error(`Target container not found for ${htmlFileName}`);
         return;
     }
     targetContainer.innerHTML = '<p class="text-center text-gray-500">Loading...</p>'; // Optional loading state

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
             targetContainer.innerHTML = targetElement.innerHTML; // Inject content

             if (initializationFunction) {
                 initializationFunction(); // Execute view-specific JS setup
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


// --- Initialization Function for the Home View ---
function initializeHomeView() {
    console.log("Initializing Home View...");
    // Get references to elements *within the newly injected HTML*
    const postsContainer = document.querySelector('#homeBody .space-y-6'); // Select the div that holds the posts
    const postTextarea = document.querySelector('#homeBody .bg-white.rounded-lg.shadow-md textarea'); // Select the textarea
    const postButton = document.querySelector('#homeBody .bg-white.rounded-lg.shadow-md button.bg-blue-500'); // Select the post button

    // --- Function to Fetch Posts ---
    const fetchPosts = async () => {
        if (!postsContainer) {
             console.error("Posts container not found in Home View!");
             return;
         }
        postsContainer.innerHTML = '<p class="text-center text-gray-500">Loading posts...</p>'; // Loading state

        // --- Get token from sessionStorage ---
        const accessToken = sessionStorage.getItem('accessToken'); // Or localStorage

        if (!accessToken) {
            // User is not logged in - redirect to login
             console.log('No access token found. Redirecting to login.');
             postsContainer.innerHTML = '<p class="text-red-500">You must be logged in to view the feed.</p>';
             alert('You must be logged in.');
             window.location.href = 'login.html'; // Redirect to your login page
            return; // Stop fetching
        }
        // -------------------------------------

        try {
            const backendPostsUrl = 'http://localhost:3000/api/posts'; // Example URL

            const response = await fetch(backendPostsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // --- Add Authorization header ---
                    'Authorization': `Bearer ${accessToken}`
                    // -------------------------------
                },
                // credentials: 'include' // Likely still needed if refresh token is HttpOnly cookie
            });

            if (response.ok) {
                const posts = await response.json();
                console.log('Fetched posts:', posts);
                renderPosts(posts); // Call the function to display the posts
            } else if (response.status === 401) {
                // --- Handle 401: Token expired or invalid ---
                console.error('Authentication failed fetching posts. Token expired or invalid.');
                sessionStorage.removeItem('accessToken'); // Clear the invalid token
                alert('Session expired. Please log in again.');
                window.location.href = 'login.html'; // Redirect
                // -------------------------------------------
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                 console.error('Failed to fetch posts:', response.status, errorData);
                 postsContainer.innerHTML = `<p class="text-red-500">Error loading posts: ${errorData.message || 'Could not fetch posts.'}</p>`;
            }

        } catch (error) {
            console.error('Network error fetching posts:', error);
             postsContainer.innerHTML = `<p class="text-red-500">Network error loading posts. Please try again.</p>`;
        }
    };

     // --- Function to Render Posts (Same as before, ensure selectors are correct) ---
    const renderPosts = (posts) => {
         if (!postsContainer) {
             console.error("Posts container not found for rendering in Home View!");
             return;
         }
        postsContainer.innerHTML = ''; // Clear loading/existing content

        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = '<p class="text-gray-500 text-center">No posts yet. Be the first to share!</p>';
            return;
        }

        posts.forEach(post => {
             // Use same dynamic HTML creation logic as before
             const postElement = document.createElement('div');
             postElement.classList.add('bg-white', 'rounded-lg', 'shadow-md');
             postElement.innerHTML = `
                 <div class="p-4">
                     <div class="flex items-center mb-4">
                         <img
                             src="${post.user?.avatarUrl || 'https://via.placeholder.com/40'}"
                             alt="${post.user?.username || 'Unknown User'}'s avatar"
                             class="w-10 h-10 rounded-full mr-3"
                         >
                         <div>
                             <h3 class="font-semibold">${post.user?.username || 'Unknown User'}</h3>
                             <p class="text-gray-500 text-sm">${new Date(post.createdAt).toLocaleString()}</p>
                         </div>
                     </div>
                     <p class="mb-4">${post.content}</p>
                     ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="w-full rounded-lg mb-4">` : ''}
                     <div class="flex justify-between text-gray-600">
                         <div>${post.location ? `📍 ${post.location}` : ''}</div>
                         <div>
                             <span>❤️ ${post.likesCount || 0}</span>
                             <span class="ml-3">💬 ${post.commentsCount || 0}</span>
                         </div>
                     </div>
                 </div>
             `;
            postsContainer.appendChild(postElement);
        });
    };


    // --- Function to Create a New Post (Same as before) ---
    const createPost = async () => {
        if (!postTextarea || !postButton) {
            console.error("Post creation elements not found in Home View!");
            return;
        }

        const content = postTextarea.value.trim();

        if (content === '') {
            alert('Post content cannot be empty.');
            return;
        }

        // --- Get token from sessionStorage ---
        const accessToken = sessionStorage.getItem('accessToken'); // Or localStorage

        if (!accessToken) {
            // User is not logged in - redirect to login
             alert('You must be logged in to create a post.');
             window.location.href = 'login.html'; // Redirect to your login page
            return; // Stop creation attempt
        }
        // -------------------------------------


        postButton.disabled = true;
        const originalButtonText = postButton.textContent;
        postButton.textContent = 'Posting...';

        try {
            const backendCreatePostUrl = 'http://localhost:3000/api/posts'; // Example URL

            const response = await fetch(backendCreatePostUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // --- Add Authorization header ---
                    'Authorization': `Bearer ${accessToken}`
                    // -------------------------------
                },
                body: JSON.stringify({ content: content }),
                // credentials: 'include' // Likely still needed if refresh token is HttpOnly cookie
            });

            if (response.ok) {
                console.log('Post created successfully.');
                postTextarea.value = ''; // Clear textarea
                fetchPosts(); // Refresh feed
            } else if (response.status === 401) {
                // --- Handle 401: Token expired or invalid ---
                console.error('Authentication failed creating post. Token expired or invalid.');
                sessionStorage.removeItem('accessToken'); // Clear the invalid token
                alert('Session expired. Please log in again.');
                window.location.href = 'login.html'; // Redirect
                // -------------------------------------------
            } else {
                 const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Failed to create post:', response.status, errorData);
                alert(errorData.message || 'Failed to create post.');
            }

        } catch (error) {
            console.error('Network error creating post:', error);
            alert('Network error. Could not create post.');
        } finally {
            postButton.disabled = false;
            postButton.textContent = originalButtonText;
        }
   };

   // --- Add Event Listener to Post Button (No changes needed here) ---
   if (postButton) {
       postButton.addEventListener('click', createPost);
   } else {
       console.error("Post button element not found in Home View!");
   }

   // --- Initial Fetch for Home View ---
   // Call fetchPosts when the home view is initialized (fetchPosts handles auth check now)
   fetchPosts();

}



// --- Initialization Function for the Settings View ---
// This function contains the logic for the logout button specifically
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


// --- Keep your other functions ---
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


// --- Handle the initial view load when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    // Determine the initial view to load. Could be 'home' by default.
    // Or you could check the URL hash (e.g., #settings) to load a specific view on page load.
    const initialView = 'home'; // Set your desired default view
    switchViews(initialView); // Load the initial view
});

// --- Helper function to fetch and inject partial HTML ---
// This is used by the specific cases like 'ascents', 'saved', etc.
// It's refactored to handle potential target container issues and accept init functions
/* The switchViews cases for 'ascents', 'saved', etc. already use this pattern,
   but I've kept the refactored helper function signature consistent with the main switchViews calls.
   You might need to adjust how targetContainer is found if IDs like profileFeed/userFeed
   are not always present in the base HTML or are nested differently.
*/
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

// This code goes into your script.js file

// ... (previous functions like switchViews, initializeHomeView, initializeSettingsView, etc.) ...

// --- Initialization Function for the Post Route View ---
function initializePostRouteView() {
    console.log("Initializing Post Route View...");

    const newRouteForm = document.getElementById('newRouteForm'); // Get form by ID
    const getLocationButton = document.getElementById('getLocationButton'); // Get the location button
    const locationStatusSpan = document.getElementById('locationStatus'); // Get the status span
    const geoLatitudeInput = document.getElementById('geoLatitude'); // Get the hidden latitude input
    const geoLongitudeInput = document.getElementById('geoLongitude'); // Get the hidden longitude input


    if (!newRouteForm || !getLocationButton || !locationStatusSpan || !geoLatitudeInput || !geoLongitudeInput) {
        console.error("Required elements for Post Route View not found!");
        // Check console to see which element was missing
        return;
    }

    // --- Add event listener to the Get Location button ---
    getLocationButton.addEventListener('click', () => {
        // Check if the browser supports Geolocation
        if (!navigator.geolocation) {
            locationStatusSpan.textContent = 'Geolocation is not supported by your browser.';
            console.error('Geolocation not supported');
            return;
        }

        locationStatusSpan.textContent = 'Getting location...';
        getLocationButton.disabled = true; // Disable button while getting location

        // --- Call the Geolocation API ---
        navigator.geolocation.getCurrentPosition(
            (position) => { // Success callback
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                console.log(`Location captured: Lat ${latitude}, Lon ${longitude}`);

                // Populate the hidden input fields
                geoLatitudeInput.value = latitude;
                geoLongitudeInput.value = longitude;

                locationStatusSpan.textContent = `Location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                locationStatusSpan.style.color = 'green'; // Optional: change color on success
                getLocationButton.disabled = false; // Re-enable button

            },
            (error) => { // Error callback
                getLocationButton.disabled = false; // Re-enable button

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
                locationStatusSpan.style.color = 'red'; // Optional: change color on error
                console.error('Geolocation error:', error);

                // Clear hidden inputs if location fails
                geoLatitudeInput.value = '';
                geoLongitudeInput.value = '';
            },
            { // Options for getCurrentPosition
                enableHighAccuracy: true, // Request high accuracy if available
                timeout: 10000, // Timeout after 10 seconds
                maximumAge: 0 // Don't use a cached position
            }
        );
    });

    // --- Keep the form submit listener as before ---
    newRouteForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = newRouteForm.querySelector('button[type="submit"]');
         if (submitButton) {
             submitButton.disabled = true;
             const originalButtonText = submitButton.textContent;
             submitButton.textContent = 'Posting Route...';
         }

        const formData = new FormData(newRouteForm); // FormData includes the hidden inputs

        // --- Validation Check for Coordinates (Optional but Recommended) ---
        // If location coordinates are mandatory for a route:
        const latitude = formData.get('latitude'); // Get value from FormData
        const longitude = formData.get('longitude'); // Get value from FormData

        // Basic check: ensure they are not empty strings if location was attempted
        // You might want more robust validation (e.g., isNaN) on the backend too
        if (!latitude || !longitude) {
             // User didn't click 'Get Location' or it failed and is mandatory
             alert('Please get your current location using the button.');
              if (submitButton) {
                 submitButton.disabled = false;
                 submitButton.textContent = originalButtonText;
             }
             return; // Stop the submission
        }
         // ------------------------------------------------------------------


        // !!! IMPORTANT !!! Update this URL to match your backend POST create route endpoint
        const backendCreateRouteUrl = 'http://localhost:3000/route/'; // Example URL

        try {
            const response = await fetch(backendCreateRouteUrl, {
                method: 'POST',
                body: formData, // FormData includes all fields (text, file, hidden lat/lon)
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json().catch(() => ({})); // Handle empty JSON response
                console.log('Route created successfully:', result);
                alert('Route created successfully!');
                newRouteForm.reset();
                // Reset location status display
                locationStatusSpan.textContent = '';
                locationStatusSpan.style.color = '';

                switchViews('routes'); // Redirect

            } else if (response.status === 401) {
                 console.error('Authentication failed while creating route. Redirecting to login.');
                 alert('Session expired or not logged in. Please log in again.');
                 window.location.href = 'login.html';
            }
             else {
                 const errorData = await response.json().catch(() => ({ message: `Error: ${response.status} ${response.statusText}` }));
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

// ... (Keep your switchViews, initializeHomeView, initializeSettingsView, switchTab, toggleDeleteDialog functions) ...

// Ensure the 'post' case in switchViews calls initializePostRouteView
/*
async function switchViews(view) {
    // ...
    case "post":
        htmlFileName = "postRoute.html";
        targetElementId = "postBody";
        initializationFunction = initializePostRouteView; // Make sure this is set
        break;
    // ...
}
*/


// You might also need initialization functions for other views if they have specific JS logic:
// function initializeChallengesView() { console.log("Challenges init"); }
// function initializeCommunitiesView() { console.log("Communities init"); }
// function initializeProfileView() { console.log("Profile init"); }
// function initializeRoutesView() { console.log("Routes init"); }
// function initializeExploreView() { console.log("Explore init"); }
// function initializeAscentsView() { console.log("Ascents init"); } // If ascents have JS logic
// function initializeSavedRoutesView() { console.log("Saved Routes init"); } // If saved routes have JS logic
// function initializeUserPostsView() { console.log("User Posts init"); } // If user posts have JS logic
// function initializeUserRoutesView() { console.log("User Routes init"); } // If user routes have JS logic
// function initializeSingleRouteView() { console.log("Single Route init"); } // If single route has JS logic
// function initializePostRouteView() { console.log("Post Route init"); } // If post route has JS logic
// function initializeSingleCommunityView() { console.log("Single Community init"); } // If single community has JS logic