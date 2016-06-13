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
    , CLASS_KIX_DOCOS_DRAFT = 'docos-anchoreddocoview-draft'
    , CLASS_KIX_DOCOS_ACTIVE = 'docos-docoview-active'
  	, CLASS_PRESENCE_MARKER = 'dcp-scrollbar-marker'
  	, CLASS_MARKER_REMOVAL = 'dcp-remove-marker'
    , ID_DOCS_HEADER_CONTROLS = 'docs-chrome'
    , PREFIX_ID_DOCO = 'dcp-'
    , PREFIX_ID_MARKER = 'dcp-marker-'
    , ATTR_NAME_ID = 'data-id'
    , INTERVAL_DOCOS_SWEEPER = 250
    , TIME_ANIMATION_SPEED = 200
    , OPACITY_MARKER = 0.33
    , OPACITY_MARKER_ACTIVE = 0.66
    , docosTracker = []
    , markerPropsTracker = {}
    , $document = $(document)
    , $body = $('body')
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
    debugLog('Init Docs Comment Presence v1.0');

    // Add filter function to only select items without parents of a certain class
    $.expr[':'].parents = function(a,i,m){
      return jQuery(a).parents(m[3]).length < 1;
    };

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
    // Fetch docos from document, properties from page
    var $docos = $document.find('div.' + CLASS_KIX_DOCOS_PRESENCE)
      .filter(':parents(.' + CLASS_KIX_DOCOS_DRAFT + ')');
    var props = getPageProperties();

    // Don't compute more than necessary
    var $doco, ID, docoID, $container;
    if ($docos.length != docosTracker.length)
    {
      // Store docos into tracker and create indicators
      $.each($docos, function(index, value)
      {
        $doco = $(value);
        if (docosTracker.includes(value)) {
          debugLog("already tracked:", value);
          // Do nothing
        } else if ($doco.attr('id')) {
          debugLog("processed but untracked:", value);
          docosTracker.push(value);   // Shouldn't happen, but doco has been processed before and isn't tracked
        }
        else  // Doco hasn't been tracked
        {
          debugLog("untracked:", value);
          ID = uniqueID();
          $doco.attr(ATTR_NAME_ID, ID);
          $doco.attr('id', PREFIX_ID_DOCO + ID);
          $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);
          drawDocoMarker(
            calculateMarkerProperties(
              $container.css('top').replace("px", ""),
              $container.outerHeight(),
              props
            )
            , $doco.css('background-color')
            , PREFIX_ID_MARKER + ID);
          docosTracker.push(value);
        }
      });

      // Need to get rid of removed docos
      docosTracker = $.grep(docosTracker, function(value)
      {
        $doco = $(value);
        ID = $doco.attr(ATTR_NAME_ID);
        docoID = $doco.attr('id');
        if ($body.find('#' + docoID).length <= 0)
        {
          // debugLog('remove:', value);
          removeDocoMarker(PREFIX_ID_MARKER + ID);
          return false;
        }
        return true;
      });
    }

    redrawDocoMarkers(props);
  }

  // Draw doco indicators
  function redrawDocoMarkers(props)
  {
    if (!props) {
      props = getPageProperties();
    }

    // Iterate through docos and redraw
    var $doco, ID, markerID, $marker, $container, top, height, markerProps, cachedProps;
    $.each(docosTracker, function(index, value)
    {
      // Setup
      $doco = $(value);
      ID = $doco.attr(ATTR_NAME_ID);
      markerID = PREFIX_ID_MARKER + ID;
      $marker = $('#' + markerID);
      $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);

      // Only calculate if needed
      top = $container.css('top').replace("px", "");
      height = $container.outerHeight();
      markerProps = calculateMarkerProperties(top, height, props);
      markerProps.relativeTop = top;
      markerProps.relativeHeight = height;
      markerProps.active = ($container.hasClass(CLASS_KIX_DOCOS_ACTIVE));
      cachedProps = markerPropsTracker[ID];
      if (cachedProps
          && (markerProps.relativeTop == cachedProps.relativeTop)
          && (markerProps.relativeHeight == cachedProps.relativeHeight)
          && (markerProps.top == cachedProps.top)
          && (markerProps.height == cachedProps.height)
        ) {
        return; // Properties set and marker is where it should be
      } else {  // Store latest state
        markerPropsTracker[ID] = markerProps;
      }

      // Redraw the marker
      drawDocoMarker(
        markerProps,
        $doco.css('background-color'),
        markerID
      );
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

  // Get page properties for positioning calculations
  function getPageProperties()
  {
    var headerHeight = $('#' + ID_DOCS_HEADER_CONTROLS).height();
    var pageHeight = $('body').height();
    return {
      documentHeight: $('div.' + CLASS_KIX_DOCUMENT_ZOOM).height(),
      headerHeight: headerHeight,
      pageHeight: pageHeight,
      scrollbarHeight: pageHeight - headerHeight,
    };
  }

  // Calculate positioning for doco indicator based off page properties
  function calculateMarkerProperties(top, height, pageProperties)
  {
    if (!pageProperties) {
      pageProperties = getPageProperties();
    }
    return {
      top: ((pageProperties.headerHeight / pageProperties.pageHeight) * 100)   // Account for chrome
        + (((top / pageProperties.documentHeight)
              * pageProperties.scrollbarHeight)
              / pageProperties.pageHeight * 100) + '%',
      height: (((height / pageProperties.documentHeight)
                  * pageProperties.scrollbarHeight)
                  / pageProperties.pageHeight * 100) + '%',
    };
  }

  // Draw a single doco indicator
  function drawDocoMarker(properties, color, id)
  {
    // debugLog("drawDocoMarker:", properties, color, id);

    // Create or find existing marker
    var $marker, newlyCreated = false;
    if (id) {
      $marker = $body.find('#' + id);
    }
    if ($marker.length <= 0)
    {
      $marker = createDocoMarker(id);
      newlyCreated = true;
    }
    else if ($marker.hasClass(CLASS_MARKER_REMOVAL)) {
      return;   // Marked for removal, do not disturb
    }

    // Calculate vertical position
    var css = {   // Set position and height relative to page
      top: properties.top,
      height: properties.height,
      opacity: (properties.active
        ? OPACITY_MARKER_ACTIVE : OPACITY_MARKER),
    };
    // debugLog("css:", css);

    // Add to document if newly created
    if (newlyCreated)
    {
      css.background = color;  // Copy node color style
      $marker.css(css);
      $body.append($marker)
        .slideDown(TIME_ANIMATION_SPEED);
    }
    else {  // Otherwise only animate height changes
      $marker.stop(true)
        .animate(css, TIME_ANIMATION_SPEED);
    }
  }

  // Clear all doco indicators
  function clearDocoMarkers()
  {
    $('.' + CLASS_PRESENCE_MARKER).stop(true)
      .addClass(CLASS_MARKER_REMOVAL)
      .slideUp('fast', function(e) {
        $(this).remove();
      });
  }

  // Remove a single doco indicator
  function removeDocoMarker(id)
  {
    $('#' + id).stop(true)
      .addClass(CLASS_MARKER_REMOVAL)
      .slideUp('fast', function(e) {
        $(this).remove();
      });
  }

});
