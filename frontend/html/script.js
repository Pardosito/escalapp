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
        case "singleCom":
            htmlFileName = "singleCommunity.html";
            targetElementId = "singleCommunityBody";
            // initializationFunction = initializeSingleCommunityView; // Create this function if needed
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


// This code goes into your script.js file

// ... (Keep your existing switchViews function and other helper functions) ...

// --- Initialization Function for the Home View ---
function initializeHomeView() {
    console.log("Initializing Home View...");

    const postsContainer = document.getElementById('postsFeedContainer'); // Div that holds the real posts
    const postCreationArea = document.getElementById('postsFeedContainer'); // The whole post creation form area

    const postTextarea = postCreationArea ? postCreationArea.querySelector('textarea#postContent') : null; // Textarea for content
    const postPhotoButton = postCreationArea ? postCreationArea.querySelector('label#postPhotoButton') : null; // Label for file input
    const postImageUploadInput = postCreationArea ? postCreationArea.querySelector('input#postImageUpload') : null; // Hidden file input
    const postImagePreview = postCreationArea ? postCreationArea.querySelector('img#postImagePreview') : null; // Image preview element
    const postFileSelectedName = postCreationArea ? postCreationArea.querySelector('div#postFileSelectedName') : null; // File name display

    const postLocationButton = postCreationArea ? postCreationArea.querySelector('button#postLocationButton') : null; // Location button
    const postLocationStatusSpan = postCreationArea ? postCreationArea.querySelector('span#postLocationStatus') : null; // Location status span
    const postGeoLatitudeInput = postCreationArea ? postCreationArea.querySelector('input#postGeoLatitude') : null; // Hidden latitude input
    const postGeoLongitudeInput = postCreationArea ? postCreationArea.querySelector('input#postGeoLongitude') : null; // Hidden longitude input

    const createPostButton = postCreationArea ? postCreationArea.querySelector('button#createPostButton') : null; // The "Post" button


    const fetchPosts = async () => {
        if (!postsContainer) {
             console.error("Posts container not found in Home View for fetching!");
             return;
         }
        // Display a loading message in the feed area
        postsContainer.innerHTML = '<p class="text-center text-gray-500">Loading posts...</p>';

        // --- Get token from sessionStorage ---
        const accessToken = sessionStorage.getItem('accessToken'); // Or localStorage

        if (!accessToken) {
            // User is not logged in - display message and redirect to login
             console.log('No access token found. User must be logged in to view the feed.');
             postsContainer.innerHTML = '<p class="text-red-500 text-center">You must be logged in to view the feed.</p>';
             // Delay alert and redirect slightly to allow message to be seen
             setTimeout(() => {
                 alert('You must be logged in to view the feed.');
                 window.location.href = 'login.html'; // Redirect to your login page
             }, 100); // Add a small delay
            return; // Stop fetching
        }
        // -------------------------------------

        try {
            // !!! IMPORTANT !!! Update this URL to match your backend GET posts endpoint
            const backendPostsUrl = 'http://localhost:3000/api/posts'; // Example URL from your router

            const response = await fetch(backendPostsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // --- Add Authorization header for authentication ---
                    'Authorization': `Bearer ${accessToken}`
                    // -------------------------------
                },
                // credentials: 'include' // Likely still needed if refresh token is HttpOnly cookie
            });

            if (response.ok) { // Status 200-299 is OK
                const posts = await response.json();
                console.log('Fetched posts:', posts);
                renderPosts(posts); // Call the function to display the posts
            } else if (response.status === 401) {
                // --- Handle 401: Token expired or invalid ---
                console.error('Authentication failed fetching posts. Token expired or invalid.');
                sessionStorage.removeItem('accessToken'); // Clear the invalid token
                postsContainer.innerHTML = '<p class="text-red-500 text-center">Session expired. Please log in again.</p>';
                 setTimeout(() => {
                     alert('Session expired. Please log in again.');
                     window.location.href = 'login.html'; // Redirect
                 }, 100);
                // -------------------------------------------
            } else {
                // Handle other API errors
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
        // Clear loading message and any previous hardcoded posts
        postsContainer.innerHTML = '';

        // If no posts are returned, display a message
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = '<p class="text-gray-500 text-center">No posts yet. Be the first to share your climbing experience!</p>';
            return;
        }

        // Loop through the posts array and create HTML for each post
        posts.forEach(post => {
             const postElement = document.createElement('div');
             postElement.classList.add('bg-white', 'rounded-lg', 'shadow-md'); // Add styling classes

             // --- Format the date (Optional: implement robust date formatting) ---
             let formattedDate = post.date ? new Date(post.date).toLocaleString() : 'Unknown date';
             // You could add logic here to display "X hours ago", "Y days ago", etc.
             // Example (basic):
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
             // ------------------------------------------------------------------


             // --- Get Image URL ---
             // The backend post projection includes 'photo'. Ensure this is the public URL path.
             const postImageUrl = (post.photo)
                               ? post.photo // Assuming backend saves/sends the public URL path
                               : null; // Or a placeholder if no photo


             // --- Get User Info (Requires backend to join/lookup user data) ---
             // Currently, your backend getPosts only projects 'creatorId'.
             // To display username and avatar, the backend needs to either:
             // 1. Perform a lookup/join on the users collection in the getPosts controller.
             // 2. Have a separate endpoint to get user details by ID.
             // For now, we'll use placeholders or the user ID if needed.
             // Let's assume the backend *could* return user info nested under 'user' property:
             // post.user = { username: "...", avatarUrl: "..." }
             const username = post.user?.username || 'Unknown User';
             const avatarUrl = post.user?.avatarUrl || 'https://via.placeholder.com/40'; // Default avatar


             // --- Construct the HTML for a single post card ---
             postElement.innerHTML = `
                 <div class="p-4">
                     <div class="flex items-center mb-4">
                         <img
                             src="${avatarUrl}" {/* Use dynamic avatar URL */}
                             alt="${username}'s avatar"
                             class="w-10 h-10 rounded-full mr-3"
                         >
                         <div>
                             <h3 class="font-semibold">${username}</h3> {/* Use dynamic username */}
                             <p class="text-gray-500 text-sm">${formattedDate}</p> {/* Use dynamic date */}
                         </div>
                     </div>
                     <p class="mb-4">${post.title || post.content || 'No content.'}</p> {/* Use 'title' or 'content' based on your backend */}
                     ${postImageUrl ? `<img src="${postImageUrl}" alt="Post image" class="w-full rounded-lg mb-4">` : ''} {/* Display image if URL exists */}

                     <div class="flex justify-between text-gray-600">
                         {/* Display Location if available and projected */}
                         ${post.latitude !== undefined && post.longitude !== undefined
                             ? `<div>📍 ${parseFloat(post.latitude).toFixed(4)}, ${parseFloat(post.longitude).toFixed(4)}</div>`
                             : post.locationText ? `<div>📍 ${post.locationText}</div>` : '<div></div>' // Assuming 'locationText' projected
                         }
                         <div>
                             <span>❤️ ${post.likes !== undefined ? post.likes : 0}</span> {/* Display likes */}
                             <span class="ml-3">💬 ${post.commentsCount || 0}</span> {/* Display comments count (if projected) */}
                         </div>
                     </div>
                     {/* Add like/comment buttons here if needed, with event listeners */}
                 </div>
             `;

            // Append the created post element to the container
            postsContainer.appendChild(postElement);
        });
    };

    const createPost = async () => {
        // Ensure required elements were found during initialization
        if (!postTextarea || !postImageUploadInput || !postGeoLatitudeInput || !postGeoLongitudeInput || !createPostButton) {
             console.error("Cannot create post: Missing required form elements.");
             alert("Error: Post creation form is not fully loaded.");
             return;
        }

        // Get the content from the textarea
        const content = postTextarea.value.trim();

        // Get the selected file (if any)
        const photoFile = postImageUploadInput.files ? postImageUploadInput.files[0] : null;

        // Validation: Require content OR a photo (adjust if one is mandatory)
        if (content === '' && !photoFile) {
            alert('Please add text content or select a photo to create a post.');
            return; // Stop the function if validation fails
        }

        // --- Get token from sessionStorage (Required for authentication) ---
        const accessToken = sessionStorage.getItem('accessToken'); // Or localStorage

        if (!accessToken) {
            console.error("No access token found. User is not logged in.");
            alert('You must be logged in to create a post. Please log in again.');
             // Optional: redirect to login page
             // window.location.href = 'login.html';
            return; // Stop post creation if not authenticated
        }
        // -----------------------------------------------------------------


        // --- Use FormData to collect all data for submission ---
        // FormData is required because you're uploading a file
        const formData = new FormData();

        // Append the text content (use the name your backend controller expects, likely 'content' or 'title')
        // Based on your backend createPost, it expects 'title' from req.body. Let's use 'title' for the text content.
        // If 'title' is separate from the main post text/content, adjust backend or frontend names.
        formData.append('title', content); // <<< Using 'title' to match backend req.body.title

        // Append geo coordinates IF they were captured and the backend expects them
        // Your backend createPost doesn't currently save latitude/longitude from req.body.
        // If you want to save post location, you need to update your backend createPost controller
        // to read latitude/longitude from req.body and save them in the new post document.
        // If you DO update the backend, append them here:
        const latitude = postGeoLatitudeInput.value;
        const longitude = postGeoLongitudeInput.value;
        if (latitude && longitude) {
            formData.append('latitude', latitude); // <<< Append if backend handles this
            formData.append('longitude', longitude); // <<< Append if backend handles this
             console.log("Appending geo coordinates to FormData:", { latitude, longitude });
        } else {
             console.log("No geo location captured or appended for this post.");
        }

        // Append the selected file IF a file was chosen
        if (photoFile) {
             // 'photo' is the NAME attribute of the file input or the field name Multer expects
             // Your backend Multer config (uploadPostPhoto) uses .single('photo').
             // The field name in FormData MUST match this: 'photo'.
            formData.append('photo', photoFile); // <<< Use 'photo' to match backend Multer field name
            console.log("Appending photo file to FormData:", photoFile.name);
        } else {
             console.log("No photo file selected or appended for this post.");
        }
        // -------------------------------------------------------


        // Optional: Disable button and show loading state
        createPostButton.disabled = true;
        const originalButtonText = createPostButton.textContent;
        createPostButton.textContent = 'Posting...';


        try {
            // !!! IMPORTANT !!! Update this URL to match your backend POST create post endpoint
            // Based on your post.js router, the endpoint for create post is POST /
            // Assuming the router is mounted at '/api/posts', the full URL is '/api/posts'
            const backendCreatePostUrl = 'http://localhost:3000/api/posts'; // <<<--- Verify this URL


            const response = await fetch(backendCreatePostUrl, {
                method: 'POST', // Use POST method for creation
                body: formData, // Send the FormData object (includes text, geo, and file)
                headers: {
                    // --- Add Authorization header for authentication ---
                    'Authorization': `Bearer ${accessToken}`
                    // -------------------------------------------------
                    // DO NOT manually set 'Content-Type' header when using FormData;
                    // fetch sets it automatically to 'multipart/form-data' with boundary
                },
                // credentials: 'include', // Likely still needed if refresh token is HttpOnly cookie
            });

            // --- Handle the response ---
            if (response.ok) { // Status 200-299 is OK (Backend should ideally send 201 Created)
                const result = await response.json().catch(() => ({ message: 'Post created successfully (no details returned).' })); // Try parsing JSON, handle potential empty response
                console.log('Post created successfully:', result);
                alert('Post created successfully!'); // Show success message

                // --- Clear the form/inputs after successful post ---
                postTextarea.value = ''; // Clear text area
                if (postImageUploadInput) postImageUploadInput.value = ''; // Clear file input
                if (postImagePreview) {
                     postImagePreview.src = '#'; // Clear preview src
                     postImagePreview.classList.add('hidden'); // Hide preview image
                     postImagePreview.classList.remove('block');
                }
                if (postFileSelectedName) {
                     postFileSelectedName.textContent = ''; // Clear file name display
                     postFileSelectedName.classList.add('hidden');
                }
                if (postGeoLatitudeInput) postGeoLatitudeInput.value = ''; // Clear hidden inputs
                if (postGeoLongitudeInput) postGeoLongitudeInput.value = '';
                if (postLocationStatusSpan) {
                     postLocationStatusSpan.textContent = ''; // Clear location status
                     postLocationStatusSpan.style.color = '';
                }
                // ----------------------------------------------------

                // Refresh the feed to show the new post
                fetchPosts();

            } else if (response.status === 401) {
                // --- Handle 401: Authentication Failed (Token expired or invalid) ---
                console.error('Authentication failed creating post. Token expired or invalid.', response.status);
                sessionStorage.removeItem('accessToken'); // Clear the invalid token from storage
                alert('Session expired. Please log in again.');
                window.location.href = 'login.html'; // Redirect to the login page
                // -----------------------------------------------------------------
            }
             else {
                // Handle other API errors (e.g., 400 Bad Request from backend validation)
                const errorData = await response.json().catch(() => ({ message: `Failed to create post. Status: ${response.status}` }));
                console.error('Failed to create post:', response.status, errorData);
                alert(errorData.message || 'Failed to create post.'); // Show user an error message
             }

        } catch (error) {
            // Handle network errors (server down, connection issues)
            console.error('Network error creating post:', error);
            alert('Network error. Could not connect to the server to create the post.');
        } finally {
             // --- Re-enable the button ---
             createPostButton.disabled = false;
             createPostButton.textContent = originalButtonText; // Restore original text
             // --------------------------
        }
   };



    if (!postsContainer) {
         console.error("Posts container (#homeBody .space-y-6) not found in Home View!");
         if (postCreationArea) postCreationArea.style.display = 'none';
         fetchPosts();
         return;
    }

    if (!postCreationArea || !postTextarea || !postPhotoButton || !postImageUploadInput || !postImagePreview || !postFileSelectedName || !postLocationButton || !postLocationStatusSpan || !postGeoLatitudeInput || !postGeoLongitudeInput || !createPostButton) {
        console.error("Some required elements for Home View post creation not found!");
        if(postCreationArea) postCreationArea.style.display = 'none';

        fetchPosts();
        return;
    }




    // ======================================================= //
    // Event Listeners for Post Creation Form                  //
    // ======================================================= //

    // Add event listener to the "Post" button
    if (createPostButton) {
        // Use 'click' event listener on the button, not 'submit' on the form
        // Since your button type is 'button', not 'submit', it won't trigger form submit
        createPostButton.addEventListener('click', createPost);
    } else {
        console.error("Post button element not found in Home View!");
    }

    // Add event listener to the "Photo" label (which is linked to the hidden file input)
    if (postImageUploadInput && postImagePreview && postFileSelectedName) {
        postImageUploadInput.addEventListener('change', (event) => {
            const file = event.target.files ? event.target.files[0] : null;

            if (file) {
                // Display file name
                postFileSelectedName.textContent = `Selected: ${file.name}`;
                postFileSelectedName.classList.remove('hidden');

                // Display image preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    postImagePreview.src = e.target.result; // Set preview source to data URL
                    postImagePreview.classList.remove('hidden'); // Show the image element
                    postImagePreview.classList.add('block'); // Ensure it's displayed block
                };
                reader.readAsDataURL(file); // Read the file content as a data URL for preview

            } else {
                // No file selected or selection was canceled
                postFileSelectedName.textContent = '';
                postFileSelectedName.classList.add('hidden');
                postImagePreview.src = '#'; // Clear the image source
                postImagePreview.classList.add('hidden'); // Hide the image element
                postImagePreview.classList.remove('block');
            }
        });
    } else {
         console.error("Required elements for Photo Upload preview not found in Home View!");
         // Hide the photo button if elements are missing
         if (postPhotoButton) postPhotoButton.style.display = 'none';
    }


     // Add event listener to the "Location" button
     if (postLocationButton && postLocationStatusSpan && postGeoLatitudeInput && postGeoLongitudeInput) {
         postLocationButton.addEventListener('click', () => {
             // Check if the browser supports Geolocation
             if (!navigator.geolocation) {
                 postLocationStatusSpan.textContent = 'Geolocation not supported by your browser.';
                 postLocationStatusSpan.style.color = 'red';
                 console.error('Geolocation not supported');
                 return;
             }

             postLocationStatusSpan.textContent = 'Getting location...';
             postLocationButton.disabled = true; // Disable button while fetching location

             // --- Call the Geolocation API ---
             navigator.geolocation.getCurrentPosition(
                 (position) => { // Success callback
                     const latitude = position.coords.latitude;
                     const longitude = position.coords.longitude;
                     console.log(`Post location captured: Lat ${latitude}, Lon ${longitude}`);

                     // Populate the hidden input fields
                     postGeoLatitudeInput.value = latitude;
                     postGeoLongitudeInput.value = longitude;

                     postLocationStatusSpan.textContent = `Location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                     postLocationStatusSpan.style.color = 'green'; // Optional: change color on success
                     postLocationButton.disabled = false; // Re-enable button

                 },
                 (error) => { // Error callback
                     postLocationButton.disabled = false; // Re-enable button

                     let errorMessage = 'Error getting location.';
                     switch(error.code) {
                         case error.PERMISSION_DENIED: errorMessage = 'Permission denied.'; break;
                         case error.POSITION_UNAVAILABLE: errorMessage = 'Unavailable.'; break;
                         case error.TIMEOUT: errorMessage = 'Timed out.'; break;
                         case error.UNKNOWN_ERROR: errorMessage = 'Unknown error.'; break;
                     }
                      postLocationStatusSpan.textContent = `Geolocation failed: ${errorMessage}`;
                      postLocationStatusSpan.style.color = 'red'; // Optional: change color on error
                      console.error('Post Geolocation error:', error);

                      // Clear hidden inputs if location fails
                      postGeoLatitudeInput.value = '';
                      postGeoLongitudeInput.value = '';
                 },
                 { // Options for getCurrentPosition
                     enableHighAccuracy: true, // Request high accuracy if available
                     timeout: 10000, // Timeout after 10 seconds
                     maximumAge: 0 // Don't use a cached position
                 }
             );
         });
     } else {
          console.error("Required elements for Post Location not found in Home View!");
          // Hide the location button if elements are missing
          if (postLocationButton) postLocationButton.style.display = 'none';
     }


    // ======================================================= //
    // Initial Actions for Home View                           //
    // ======================================================= //

   // Call fetchPosts when the home view is initialized to load the feed
   fetchPosts();

   console.log("Home View initialization complete.");
}


// ... (Keep your other functions like switchViews, initializeSettingsView, switchTab, toggleDeleteDialog, fetchAndInjectPartial) ...

// Ensure the 'home' case in switchViews calls initializeHomeView
/*
async function switchViews(view, id = null) { // Ensure switchViews accepts id
    // ...
    case "home":
        htmlFileName = "index.html";
        targetElementId = "homeBody";
        initializationFunction = initializeHomeView; // Set the init function
        break;
    // ...
     if (initializationFunction) {
        // If the init function needs the ID (like for single route), pass it
        // For home view, it doesn't need the ID
         if (view === 'singleRoute') {
             initializationFunction(id); // Pass ID for singleRoute
         } else {
             initializationFunction(); // Call without ID for other views like home
         }
     }
    // ...
}
*/

// ... (Keep your DOMContentLoaded listener) ...



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

            const imageUrl = route.images && route.images.length > 0 ? route.images[0] : 'https://d3byf4kaqtov0k.cloudfront.net/p/news/syxpy5yl.webp';

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

    // --- Function to Render Route Details into the HTML ---
    const renderRouteDetails = (route) => {
        // Populate the HTML elements with data from the fetched route object

        // Title
        if (singleRouteTitle) singleRouteTitle.textContent = route.title || 'Untitled Route';

        // Image (use the first image URL if available)
        if (singleRouteImage) {
            const imageUrl = (route.images && Array.isArray(route.images) && route.images.length > 0)
                             ? route.images[0]
                             : 'https://via.placeholder.com/800x400?text=No+Image';
            singleRouteImage.src = imageUrl;
            singleRouteImage.alt = route.title || 'Climbing Route';
        }

        // Location (using latitude/longitude from the GET /route/:id projection)
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

    // ======================================================= //
    // End of Helper Functions specific to Single Route View //
    // ======================================================= //


    // --- Initial Fetch for Single Route View ---
    // Call fetchRouteDetails with the route ID when the view is initialized
    fetchRouteDetails(routeId);

    // Optional: Handle the back button within this function if its behavior needs to be dynamic
    // const backButton = document.querySelector('.back-button'); // Get back button by class or ID
    // if (backButton) {
    //     backButton.addEventListener('click', () => switchViews('routes'));
    // }

    console.log("Single Route View initialization complete.");
}