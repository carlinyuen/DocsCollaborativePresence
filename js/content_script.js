/* Required:
 * js/third_party/jquery-2.1.0.min.js
 * js/constants.js */

$(function()
{
  // Variables & Constants
  var CLASS_KIX_COLLABORATIVE_CURSOR = 'kix-cursor'
    , CLASS_KIX_DOCUMENT_ZOOM = 'kix-zoomdocumentplugin-outer'
    , CLASS_KIX_DOCOS_PRESENCE = 'docos-user-presence'
    , CLASS_KIX_DOCOS_CONTAINER = 'docos-anchoreddocoview'
  	, CLASS_PRESENCE_MARKER = 'dcp-scrollbar-marker'
    , ID_DOCS_HEADER_CONTROLS = 'docs-chrome'
    , PREFIX_ID_DOCO = 'dcp-'
    , PREFIX_ID_MARKER = 'dcp-marker-'
    , INTERVAL_DOCOS_SWEEPER = 200
    , TIME_ANIMATION_SPEED = 200
    , docosTracker = []
	;

  // Initialize
  init();


  /////////////////////////////////////////
  // FUNCTIONS

	// Custom log function
	function debugLog() {
		if (DEBUG && console) {
			console.log.apply(console, arguments);
		}
	}

  // Initialize the extension script
  function init()
  {
    debugLog('Init Docs Collaborative Presence v1.0');

    // Doesn't work -- can't seem to track when inserted
    // $(document).on('DOMNodeInserted', function(e)
    // {
    //   var docos = $(e.target).find("." + CLASS_KIX_DOCOS_CONTAINER);
    //   if (docos.length) {
    //     alert("docos:" + docos.length);
    //   }
    // });

    // Look for docos regularly
    setInterval(sweepDocos, INTERVAL_DOCOS_SWEEPER);
  }

  // Generates unique ID
  function uniqueID() {
    return Math.round(new Date().getTime() * (Math.random() * 100));
  }

  // Search for docos
  function sweepDocos()
  {
    // Fetch docos from document
    var $docos = $(document).find('div.' + CLASS_KIX_DOCOS_PRESENCE);

    // Store docos into tracker
    $.each($docos, function(index, value)
    {
      var $doco = $(value);
      if (docosTracker.includes(value)) {
        // Do nothing
      } else if ($doco.attr('id')) {
        docosTracker.push(value);   // Shouldn't happen, but doco has been processed before and isn't tracked
      }
      else  // Doco hasn't been tracked
      {
        var ID = uniqueID();
        $doco.attr('id', PREFIX_ID_DOCO + ID);
        var $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);
        drawDocoMarker($container.css('top').replace("px", "")
          , $container.outerHeight()
          , $doco.css('background-color')
          , PREFIX_ID_MARKER + ID);
        docosTracker.push(value);
      }
    });

    // Need to get rid of removed docos
    docosTracker = $.grep(docosTracker, function(value)
    {
      var id = $(value).attr('id');
      if ($('body').find('#' + id).length <= 0)
      {
        debugLog('remove:', value);
        removeDocoMarker(PREFIX_ID_MARKER + id.substr(PREFIX_ID_DOCO.length));
        return false;
      }
      return true;
    });

    redrawDocoMarkers();
  }

  // Draw doco indicators
  function redrawDocoMarkers()
  {
    // clearDocoMarkers();

    // Iterate through docos and redraw
    $.each(docosTracker, function(index, value) {
      var $doco = $(value);
      var id = $doco.attr('id');
      var $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);
      drawDocoMarker($container.css('top').replace("px", "")
        , $container.outerHeight()
        , $doco.css('background-color')
        , PREFIX_ID_MARKER + id.substr(PREFIX_ID_DOCO));
    });
  }

  // Creates a doco indicator, returns jQuery object
  function createDocoMarker(id)
  {
    var $marker = $(document.createElement('div')).addClass(CLASS_PRESENCE_MARKER);
    if (id) {
      $marker.attr('id', id);
    }
    return $marker;
  }

  // Draw a single doco indicator
  function drawDocoMarker(top, height, color, id)
  {
    // debugLog("drawDocoMarker:", top, height, color, id);

    // Create marker
    var $marker, newlyCreated = false;
    if (id) {
      $marker = $('body').find('#' + id);
    }
    if ($marker.length <= 0)
    {
      $marker = createDocoMarker(id);
      newlyCreated = true;
    }

    // Calculate vertical position
    var documentHeight = $('div.' + CLASS_KIX_DOCUMENT_ZOOM).height();
    var headerHeight = $('#' + ID_DOCS_HEADER_CONTROLS).height();
    var pageHeight = $('body').height();
    var scrollbarHeight = pageHeight - headerHeight;
    var css = {   // Set position and height relative to page
      top: ((headerHeight / pageHeight) * 100)   // Account for chrome
        + (((top / documentHeight) * scrollbarHeight) / pageHeight * 100) + '%',
      height: (((height / documentHeight) * scrollbarHeight) / pageHeight * 100) + '%',
      opacity: 0.5,
    };
    // debugLog("css:", css);

    // Add to document if newly created
    if (newlyCreated)
    {
      css.background = color;  // Copy node color style
      $marker.css(css);
      $('body').append($marker).slideDown(TIME_ANIMATION_SPEED);
    }
    else {  // Otherwise only animate height changes
      $marker.stop(true).animate(css, TIME_ANIMATION_SPEED);
    }
  }

  // Clear all doco indicators
  function clearDocoMarkers()
  {
    $('.' + CLASS_PRESENCE_MARKER)
      .fadeOut('slow', function(e) {
        $(this).remove();
      });
  }

  // Remove a single doco indicator
  function removeDocoMarker(id)
  {
    $('#' + id)
      .fadeOut('slow', function(e) {
        $(this).remove();
      });
  }

});
