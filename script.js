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
                const mainDiv = doc.getElementById("mainDiv");
                if (mainDiv) {
                    mainDiv.innerHTML = mainDiv.innerHTML;
                } else {
                    console.error("mainDiv not found in fetched HTML");
                }
            })
            break;
    
        default:
            break;
    }
}