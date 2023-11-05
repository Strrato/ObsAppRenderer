const SERVER_URL = "ws://localhost:4242/"+appChan;
const ws = new WebSocket(SERVER_URL);

let init = true;

ws.onerror = err => {
    console.error(err);
};

ws.onopen = () => {
    console.log('Socket open');
    $('#content').html('<div style="text-align: center; color: white; background-color: green; padding: 10px">Connected ! </div>');
    setTimeout(() => {
        $('#content').html('');
    }, 1000);
};

ws.onmessage = event => {
    console.log('message', event);
    let data = JSON.parse(event.data);
    console.log(data);
    if (data.type == 'message'){
        if (init){
            $('#content').html('');
            init = false;
        }

        let message = attachEmotes(data.message);
        let isModerator = false;
        let badges = "",
            badge;
        for (let i = 0; i < data.author.badges.length; i++) {
            badge = data.author.badges[i];
            badges += `<img alt="" src="${badge.url}" class="badge"> `;
            if(badge.type == "moderator"){
                isModerator = true;
            }
        }

        addMessage(data.author, 
            message,
            42,
            badges, 
            isModerator,
            data.source
        );
    }else if (data.type == 'image'){
        $('.message-image img[data-from="'+ data.id +'"][data-source="'+ data.source +'"]').attr('src', data.url);
    }
    
};

let totalMessages = 0;
let hideCommands = "true";
let messageSize = 24;
let hideAfter = 60;
let animationIn = 'bounceIn';
let animationOut = 'bounceOut';
let messageColor = "#fff";
let messageBackground = "#248bf5";
let streamerColor = "#ffd700";
let modoColor = "#ffd700";
let fontSize = "24px";
let useUserColor = true;
let idStreamer = currentUser.username;
let userCache = {};
let userIdsSearch = [];
let apiTimeout = null;
let idsSeparator = ",";
let messagesLimit = 0;
let ignoreUsers = [];
let cacheCreated = new Date();

function setViewPort(){
    $('#app-container').css('height', window.innerHeight+'px');
}

$(function(){
    $(window).on('resize', setViewPort);

    setViewPort();
});

window.addEventListener("onEventReceived", function (obj) {  

if (obj.detail.listener === "delete-message") {
    const msgId = obj.detail.event.msgId;
    $(`.row[data-id=${msgId}]`).remove();
    return;
} else if (obj.detail.listener === "delete-messages") {
    const userId = obj.detail.event.userId;
    $(`.row[data-from=${userId}]`).remove();
    return;
}


if (obj.detail.listener !== "message") return;

let data = obj.detail.event.data;

if (data.text.startsWith("!")) return;

if (ignoreUsers.indexOf(data.nick) !== -1) return;

let message = attachEmotes(data);
let isModerator = false;
let badges = "",
    badge;
for (let i = 0; i < data.badges.length; i++) {
    badge = data.badges[i];
    badges += `<img alt="" src="${badge.url}" class="badge"> `;
    if(badge.type == "moderator"){
    isModerator = true;
    }
}

let color = data.tags.color;
if (color === "") {
    const username = data.displayName;
    color = data.displayColor !== "" ? data.displayColor : "#" + (md5(username).substr(26));
}

addMessage(obj.detail.event.data.displayName, 
            message, 
            badges, 
            data.userId, 
            data.msgId,
            color,
            data.isAction,
            isModerator
            );
});

function getHoursDiff(startDate, endDate) {
    var msInHour = 1000 * 60 * 60;
    return Math.round(Math.abs(endDate - startDate) / msInHour);
}

function loadUserImage(userId){
    let element = $('.message-image img[data-from="'+ userId +'"]');

    let now = new Date();
    console.log(getHoursDiff(cacheCreated, now));
    if (getHoursDiff(cacheCreated, now) >= 1){
        console.log("reset cache");
        userCache = {};
        cacheCreated = new Date();
    }

    if (userId in userCache){
        console.log(userId, " loaded from cache");
        element.attr('src', userCache[userId]);
        return;
    }

    userIdsSearch.push(userId);

    // Api call
    if (apiTimeout === null){
        apiTimeout = setTimeout(() => {
        apiTimeout = null;
        console.log("Api call for ids :", userIdsSearch);

        let urlParams = userIdsSearch.join(idsSeparator);
        userIdsSearch = [];
        
        $.ajax({
            type : "GET",
            beforeSend : (req) => {
                req.setRequestHeader("X-AUTH-TOKEN", API_TOKEN);
            },
            url: "https://service-9617.something.gg/api/userimage/" + urlParams,
            success: (res) => {
            let users = JSON.parse(res);
            for(let prop in users){
                let data = users[prop];
                console.log('loaded user from api ', prop, data);
                userCache[prop] = data;
                
                $('.message-image img[data-from="'+ prop +'"]').attr('src', data);
            }
            
            },
            error : (err) => {
                console.log(err);
            }
        });

        
        }, 1000);
    }
}

function addMessage(author, message, msgId, badges, isModerator, source) {
    totalMessages += 1;
    let actionClass = "";

    let styleUserColor = "";
    if (useUserColor){
        styleUserColor = `background-color: ${author.color};`;
    }
    
    if (idStreamer.toLowerCase() == author.name.toLowerCase()){
        styleUserColor += "border: .15em solid " + streamerColor + ";" ;
    }

    if (isModerator){
        styleUserColor += "border: .15em solid " + modoColor + ";" ;
    }

    console.log('styleUserColor', styleUserColor);

    let avatar = author.avatar ? author.avatar : 'https://c.tenor.com/wpSo-8CrXqUAAAAi/loading-loading-forever.gif';
    
    const element = $.parseHTML(`
    <div class="row ${animationIn} animated" data-from="${author.id}" data-id="${msgId}">
        <div data-from="${author.id}" data-id="${msgId}" class="message-row" id="msg-${totalMessages}" style="${styleUserColor}">
        <div class="message">
            <div class="container-message ${actionClass}">
                <span class="name"><span class="badges">${badges}</span> ${author.name} :</span><span class="message-content">${message}</span>
            </div>
        </div>
        </div>
        <div class="message-image">
        <img data-from="${author.id}" data-source="${source}" src="${avatar}" style="border: .15em solid ${author.color}"/>
        </div>
    </div>
    `);
    

    if (hideAfter !== 0) {
        $(element)
        .appendTo('#content')
        .delay(hideAfter * 1000)
        .queue(function () {
            $(this).removeClass(animationIn).addClass(animationOut).delay(1000).queue(function () {
                $(this).remove()
                totalMessages -= 1;
            }).dequeue();
        });
    } else {
    $(element)
        .appendTo('#content');
    }

    $("html, body").animate({ scrollTop: $(document).height()-$(window).height() });

    //loadUserImage(userId);

    if (messagesLimit > 0 && totalMessages > messagesLimit){
        removeRow();
    }

}

function attachEmotes(message) {

    if (typeof message === typeof ''){
        return message;
    }

    let text = html_encode(message.text);
    let data = message.emotes;
    if (typeof message.attachment !== "undefined") {
        if (typeof message.attachment.media !== "undefined") {
        if (typeof message.attachment.media.image !== "undefined") {
            text = `${message.text}<img src="${message.attachment.media.image.src}">`;
        }
        }
    }
    return text.replace(/([^\s]*)/gi, function (e, key) {
        let result = data.filter((emote) => {
        return emote.name === key;
        });
        if (typeof result[0] !== "undefined") {      
        let url = result[0]["urls"][4];
        
        let width = fontSize;
        let height = fontSize;

            return `<img class="emote" style="width: ${width}; display: inline-block;" src="${url}"/>`;
        } else {
            return key;
        } 
    });
}

function html_encode(e) {
    return e.replace(/[<>"^]/g, function (e) {
        return "&#" + e.charCodeAt(0) + ";";
    });
}

function isOverflowing(element){
    var rect = element.getBoundingClientRect();
    return (
            (rect.x + rect.width) < 0 
                || (rect.y + rect.height) < 0
                || (rect.x > window.innerWidth || rect.y > window.innerHeight)
            );
}

function removeRow(){
    $('#content > .row:first-child').removeClass(animationIn).addClass(animationOut).delay(1000).queue(function () {
        $(this).remove()
        totalMessages -= 1;
    }).dequeue();
}
