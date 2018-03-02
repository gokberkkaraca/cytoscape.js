"use strict";
document.addEventListener('DOMContentLoaded', function () {
    var mainUser;
    var cy = window.cy = cytoscape({
        container: document.getElementById('cy')
    });

    var submitButton = document.getElementById("submitButton");
    submitButton.addEventListener('click', function () {
        cy.elements().remove();
        var userInput = document.getElementById('twitterHandle').value;
        if (userInput) {
            mainUser = userInput
        }
        else {
            mainUser = 'cytoscape';
        }

        // add first user to graph
        getUser(mainUser)
            .then(function(then) {
                addToGraph(then.user, then.followers, 0);

                // add followers
                try {
                    var options = {
                        maxLevel: 4,
                        usersPerLevel: 3,
                        layout: concentricLayout
                    };
                    addFollowersByLevel(1, options);
                } catch (error) {
                    console.log(error);
                }
            })
            .catch(function(err) {
                console.log('Could not get data. Error message: ' + err);
            });
    });

    submitButton.click();

    function addToGraph(targetUser, followers, level) {
        // targetUser
        if (cy.getElementById(targetUser.id_str).empty()) {
            cy.add(twitterUserObjToCyEle(targetUser, level));
        }

        // followers
        var targetId = targetUser.id_str;
        cy.batch(function () {
            followers.forEach(function (twitterFollower) {
                if (cy.getElementById(twitterFollower.id_str).empty()) {
                    cy.add(twitterUserObjToCyEle(twitterFollower, level + 1));
                    cy.add({
                        data: {
                            id: 'follower-' + twitterFollower.id_str,
                            source: twitterFollower.id_str,
                            target: targetId
                        },
                        selectable: false
                    });
                }
            });
        });
    }


    function addFollowersByLevel(level, options) {
        function followerCompare(a, b) {
            return a.data('followerCount') - b.data('followerCount');
        }

        function topFollowerPromises(sortedFollowers) {
            return sortedFollowers.slice(-options.usersPerLevel)
                .map(function (follower) {
                    // remember that follower is a Cy element so need to access username
                    var followerName = follower.data('username');
                    return getUser(followerName);
                });
        }

        var quit = false;
        if (level < options.maxLevel && !quit) {
            var topFollowers = cy.nodes()
                .filter('[level = ' + level + ']')
                .sort(followerCompare);
            var followerPromises = topFollowerPromises(topFollowers);
            Promise.all(followerPromises)
                .then(function (userAndFollowerData) {
                    // all data returned successfully!
                    for (var i = 0; i < userAndFollowerData.length; i++) {
                        var twitterData = userAndFollowerData[i];
                        if (twitterData.user.error || twitterData.followers.error) {
                            // error occured, such as rate limiting
                            var error = twitterData.user.error ? twitterData.user : twitterData.followers;
                            console.log('Error occured. Code: ' + error.status + ' Text: ' + error.statusText);
                            if (error.status === 429) {
                                // rate limited, so stop sending requests
                                quit = true;
                            }
                        } else {
                            addToGraph(twitterData.user, twitterData.followers, level);
                        }
                    }
                    addFollowersByLevel(level + 1, options);
                }).catch(function (err) {
                console.log('Could not get data. Error message: ' + err);
            });
        } else {
            // reached the final level, now let's lay things out
            cy.layout(options.layout);
        }
    }
});

function getUser(targetUser) {
    var userPromise = $.ajax({
        url: 'http://blog.js.cytoscape.org/public/demos/twitter-graph/cache/' + targetUser + '-user.json',
        type: 'GET',
        dataType: 'json'
    });

    var followersPromise = $.ajax({
        url: 'http://blog.js.cytoscape.org/public/demos/twitter-graph/cache/' + targetUser + '-followers.json',
        type: 'GET',
        dataType: 'json'
    });

    return Promise.all([userPromise, followersPromise])
        .then(function (then) {
            return {
                user: then[0],
                followers: then[1]
            }
        })
}

function twitterUserObjToCyEle(user, level) {
    return {
        data: {
            id: user.id_str,
            username: user.screen_name,
            followerCount: user.followers_count,
            tweetCount: user.statuses_count,

            fullName: user.name,
            followingCount: user.friends_count,
            location: user.location,
            description: user.description,
            profilePic: user.profile_image_url,
            level: level
        },
        position: {
            x: -1000000,
            y: -1000000
        }
    }
}