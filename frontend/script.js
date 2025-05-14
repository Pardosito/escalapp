async function switchViews(view) {
    let mainDiv = document.getElementById("mainDiv");

    switch (view) {
        case "challenges":
            await fetch("./challenges.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const challengesBody = doc.getElementById("challengesBody");
                if (challengesBody) {
                    mainDiv.innerHTML = challengesBody.innerHTML;
                } else {
                    console.error("challengesBody not found in fetched HTML");
                }
            })
            break;
    
        case "communities":
            await fetch("./communities.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const communitiesBody = doc.getElementById("communitiesBody");
                if (communitiesBody) {
                    mainDiv.innerHTML = communitiesBody.innerHTML;
                } else {
                    console.error("communitiesBody not found in fetched HTML");
                }
            })
            break;
        
        case "profile":
            await fetch("./profile.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const profileBody = doc.getElementById("profileBody");
                if (profileBody) {
                    mainDiv.innerHTML = profileBody.innerHTML;
                } else {
                    console.error("profileBody not found in fetched HTML");
                }
            })
            break;
        
        case "routes":
            await fetch("./routes.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const routesBody = doc.getElementById("routesBody");
                if (routesBody) {
                    mainDiv.innerHTML = routesBody.innerHTML;
                } else {
                    console.error("routesBody not found in fetched HTML");
                }
            })
            break;
        
        case "settings":
            await fetch("./settings.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const settingsBody = doc.getElementById("settingsBody");
                if (settingsBody) {
                    mainDiv.innerHTML = settingsBody.innerHTML;
                } else {
                    console.error("settingsBody not found in fetched HTML");
                }
            })
            break;
        
        case "home":
            await fetch("./index.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const fetchedMainDiv = doc.getElementById("mainDiv");
                if (fetchedMainDiv) {
                    mainDiv.innerHTML = fetchedMainDiv.innerHTML;
                } else {
                    console.error("mainDiv not found in fetched HTML");
                }
            })
            break;

        case "explore":
            await fetch("./explore.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const exploreFeed = doc.getElementById("exploreFeed");
                if (exploreFeed) {
                    mainDiv.innerHTML = exploreFeed.innerHTML;
                } else {
                    console.error("exploreFeed not found in fetched HTML");
                }
            })
            break;

        case "ascents":
            let profileFeed = document.getElementById("profileFeed");
            profileFeed.classList.remove('grid', 'md:grid-cols-3');

            await fetch("./ascents.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const exploreFeed = doc.getElementById("ascentsBody");
                if (exploreFeed) {
                    profileFeed.innerHTML = exploreFeed.innerHTML;
                } else {
                    console.error("exploreFeed not found in fetched HTML");
                }
            })
            break;

        case "saved":
            let routesFeed = document.getElementById("profileFeed");

            await fetch("./savedRoutes.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const exploreFeed = doc.getElementById("savedRoutesBody");
                if (exploreFeed) {
                    routesFeed.innerHTML = exploreFeed.innerHTML;
                } else {
                    console.error("savedRoutesBody not found in fetched HTML");
                }
            })
            break;
        
        case "post":
            await fetch("./postRoute.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const postBody = doc.getElementById("postBody");
                if (postBody) {
                    mainDiv.innerHTML = postBody.innerHTML;
                } else {
                    console.error("postBody not found in fetched HTML");
                }
            })
            break;

        case "singleRoute":
            await fetch("./singleRoute.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const singleRouteBody = doc.getElementById("singleRouteBody");
                if (singleRouteBody) {
                    mainDiv.innerHTML = singleRouteBody.innerHTML;
                } else {
                    console.error("singleRouteBody not found in fetched HTML");
                }
            })
            break;

        case "userPosts":
            let userFeed1 = document.getElementById("userFeed");

            await fetch("./userPosts.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const userPosts = doc.getElementById("userPosts");
                if (userPosts) {
                    userFeed1.innerHTML = userPosts.innerHTML;
                } else {
                    console.error("userPosts not found in fetched HTML");
                }
            })
            break;

        case "userRoutes":
            let userFeed = document.getElementById("userFeed");

            await fetch("./userRoutes.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const userRoutes = doc.getElementById("userRoutes");
                if (userRoutes) {
                    userFeed.innerHTML = userRoutes.innerHTML;
                } else {
                    console.error("userRoutes not found in fetched HTML");
                }
            })
            break;

        case "singleCom":
            await fetch("./singleCommunity.html")
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const singleCommunityBody = doc.getElementById("singleCommunityBody");
                if (singleCommunityBody) {
                    mainDiv.innerHTML = singleCommunityBody.innerHTML;
                } else {
                    console.error("singleCommunityBody not found in fetched HTML");
                }
            })
            break;
        
    
        default:
            break;
    }
}