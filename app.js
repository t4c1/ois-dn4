

var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

var userEHRId="";
var demoIDs=["4511d2cb-7b31-474c-a82d-acfdedc302ca","",""];

function graf(){
	nv.addGraph(function() {
	  var chart = nv.models.scatterChart()
	                .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
	                .showDistY(true)
	                .transitionDuration(350)
	                .color(d3.scale.category10().range());
	
	  //Configure how the tooltip looks.
	  chart.tooltipContent(function(key) {
	      return '<h3>' + key + '</h3>';
	  });
	
	  //Axis settings
	  chart.xAxis.tickFormat(d3.format('.02f'));
	  chart.yAxis.tickFormat(d3.format('.02f'));
	
	  //We want to show shapes other than circles.
	  chart.scatter.onlyCircles(false);
	
	  var myData = randomData(4,40);
	  d3.select('svg')
	      .datum(myData)
	      .call(chart);
	
	  nv.utils.windowResize(chart.update);
	
	  return chart;
	});
}

/**************************************
 * Simple test data generator
 */
function randomData(groups, points) { //# groups,# points per group
  var data = [],
      shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
      random = d3.random.normal();

  for (i = 0; i < groups; i++) {
    data.push({
      key: 'Group ' + i,
      values: []
    });

    for (j = 0; j < points; j++) {
      data[i].values.push({
        x: random()
      , y: random()
      , size: Math.random()   //Configure the size of each scatter point
      , shape: (Math.random() > 0.95) ? shapes[j % 6] : "circle"  //Configure the shape of each scatter point.
      });
    }
  }

  return data;
}


function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


function kreirajEHRzaBolnika() {
	var ime = $("#kreirajIme").val();
	var priimek = $("#kreirajPriimek").val();
	var datumRojstva = $("#kreirajDatumRojstva").val();

	if (!ime || !priimek || !datumRojstva || ime.trim().length == 0 || priimek.trim().length == 0 || datumRojstva.trim().length == 0) {
		$("#kreirajSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
		zahtevaZaEHR(ime,priimek,datumRojstva,function(ehrId,party){
            if (party.action == 'CREATE') {
                $("#kreirajSporocilo").html("<span class='obvestilo label label-success fade-in'>Uspešno kreiran EHR '" + ehrId + "'.</span>");
                console.log("Uspešno kreiran EHR '" + ehrId + "'.");
                $("#preberiEHRid").val(ehrId);
            	userEHRId=ehrId;
            }
		}, function(err){
        	$("#kreirajSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
        	console.log(JSON.parse(err.responseText).userMessage);
		});
	}
}

function zahtevaZaEHR(ime,priimek,datumRojstva,success,error){
	sessionId = getSessionId();
	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
	    url: baseUrl + "/ehr",
	    type: 'POST',
	    success: function (data) {
	        var ehrId = data.ehrId;
	        var partyData = {
	            firstNames: ime,
	            lastNames: priimek,
	            dateOfBirth: datumRojstva,
	            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
	        };
	        $.ajax({
	            url: baseUrl + "/demographics/party",
	            type: 'POST',
	            contentType: 'application/json',
	            data: JSON.stringify(partyData),
	            success: function(party){success(ehrId,party)},
	            error: error
	        });
	    }
	});
}

function preberiEHRodBolnika() {
	sessionId = getSessionId();

	var ehrId = $("#preberiEHRid").val();

	if (!ehrId || ehrId.trim().length == 0) {
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek2!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	$.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (data) {
			var party = data.party;
			$("#preberiSporocilo").html("<span class='obvestilo label label-success fade-in'>Bolnik '" + party.firstNames + " " + party.lastNames + "', ki se je rodil '" + party.dateOfBirth + "'.</span>");
			console.log("Bolnik '" + party.firstNames + " " + party.lastNames + "', ki se je rodil '" + party.dateOfBirth + "'.");
		},
		error: function(err) {
			$("#preberiSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}


function dodajMeritveVitalnihZnakov() {
	sessionId = getSessionId();

	var ehrId = $("#dodajVitalnoEHR").val();
	var datumInUra = $("#dodajVitalnoDatumInUra").val(); //default je zdaj!
	var telesnaVisina = $("#dodajVitalnoTelesnaVisina").val();
	var telesnaTeza = $("#dodajVitalnoTelesnaTeza").val();
	var telesnaTemperatura = $("#dodajVitalnoTelesnaTemperatura").val();
	var sistolicniKrvniTlak = $("#dodajVitalnoKrvniTlakSistolicni").val();
	var diastolicniKrvniTlak = $("#dodajVitalnoKrvniTlakDiastolicni").val();
	var nasicenostKrviSKisikom = $("#dodajVitalnoNasicenostKrviSKisikom").val();
	var merilec = $("#dodajVitalnoMerilec").val();

	if (!ehrId || ehrId.trim().length == 0) {
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek2!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,merilec);
}

function posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,merilec){
	$.ajaxSetup({
		headers: {"Ehr-Session": sessionId}
	});
	var podatki = {
		// Preview Structure: https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
		"ctx/language": "en",
		"ctx/territory": "SI",
		"ctx/time": datumInUra,
		"vital_signs/height_length/any_event/body_height_length": telesnaVisina,
		"vital_signs/body_weight/any_event/body_weight": telesnaTeza,
		"vital_signs/body_temperature/any_event/temperature|magnitude": telesnaTemperatura,
		"vital_signs/body_temperature/any_event/temperature|unit": "°C",
		"vital_signs/blood_pressure/any_event/systolic": sistolicniKrvniTlak,
		"vital_signs/blood_pressure/any_event/diastolic": diastolicniKrvniTlak,
		"vital_signs/indirect_oximetry:0/spo2|numerator": nasicenostKrviSKisikom
	};
	var parametriZahteve = {
		"ehrId": ehrId,
		templateId: 'Vital Signs',
		format: 'FLAT',
		committer: merilec
	};
	$.ajax({
		url: baseUrl + "/composition?" + $.param(parametriZahteve),
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(podatki),
		success: function (res) {
			console.log(res.meta.href);
			$("#dodajMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-success fade-in'>" + res.meta.href + ".</span>");
		},
		error: function(err) {
			$("#dodajMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}

function kreirajDemo1(){
	zahtevaZaEHR("Zdravi","Človek","1960-10-30T00:00",function(ehrId, party) {
		demoIDs[0]=ehrId;
		userEHRId=ehrId;
		var datumInUra = new Date();
		datumInUra.setDate();
		datumInUra.setFullYear(1975);
		for(var i =0;i<100;i++){
			var mesec=datumInUra.getMonth();
			if (mesec==11){
				datumInUra.setYear(1+datumInUra.getYear());
			}
			datumInUra.setMonth(mesec+1);
			var telesnaVisina = 110+Math.pow(i,0.5);
			var telesnaTeza = 50 + i/2 + Math.random();
			var telesnaTemperatura = 35.2 + Math.random()*1.8;
			var sistolicniKrvniTlak = 120 + 10*Math.random();
			var diastolicniKrvniTlak = 60 + 10*Math.random();
			var nasicenostKrviSKisikom = 95 + 5*Math.random();
			var merilec = "Zdravi Človek";
			posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,merilec);
		}
	},function(err) {
	    alert(err);
	});
}

function krerirajDemo(){
	kreirajDemo1();
}


function preberiMeritveVitalnihZnakov() {
	sessionId = getSessionId();	

	var ehrId = $("#meritveVitalnihZnakovEHRid").val();
	var tip = $("#preberiTipZaVitalneZnake").val();

	if (!ehrId || ehrId.trim().length == 0){
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek2!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	if( !tip || tip.trim().length == 0) {
		$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
		return;
	}
	$.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (data) {
			var party = data.party;
			$("#rezultatMeritveVitalnihZnakov").html("<br/><span>Pridobivanje podatkov za <b>'" + tip + "'</b> bolnika <b>'" + party.firstNames + " " + party.lastNames + "'</b>.</span><br/><br/>");
			if (tip == "telesna temperatura") {
				$.ajax({
					url: baseUrl + "/view/" + ehrId + "/" + "body_temperature",
					type: 'GET',
					headers: {"Ehr-Session": sessionId},
					success: function (res) {
						if (res.length > 0) {
							var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>Telesna temperatura</th></tr>";
							for (var i in res) {
								results += "<tr><td>" + res[i].time + "</td><td class='text-right'>" + res[i].temperature + " " 	+ res[i].unit + "</td>";
							}
							results += "</table>";
							$("#rezultatMeritveVitalnihZnakov").append(results);
						} else {
							$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
						}
					},
					error: function() {
						$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
						console.log(JSON.parse(err.responseText).userMessage);
					}
				});
			} else if (tip == "telesna teža") {
				$.ajax({
					url: baseUrl + "/view/" + ehrId + "/" + "weight",
					type: 'GET',
					headers: {"Ehr-Session": sessionId},
					success: function (res) {
						if (res.length > 0) {
							var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>Telesna teža</th></tr>";
							for (var i in res) {
								results += "<tr><td>" + res[i].time + "</td><td class='text-right'>" + res[i].weight + " " 	+ res[i].unit + "</td>";
							}
							results += "</table>";
							$("#rezultatMeritveVitalnihZnakov").append(results);
						} else {
							$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
						}
					},
					error: function() {
						$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
						console.log(JSON.parse(err.responseText).userMessage);
					}
				});					
			} else if (tip == "telesna temperatura AQL") {
				var AQL = 
					"select " +
						"t/data[at0002]/events[at0003]/time/value as cas, " +
						"t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude as temperatura_vrednost, " +
						"t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/units as temperatura_enota " +
					"from EHR e[e/ehr_id/value='" + ehrId + "'] " +
					"contains OBSERVATION t[openEHR-EHR-OBSERVATION.body_temperature.v1] " +
					"where t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude<35 " +
					"order by t/data[at0002]/events[at0003]/time/value desc " +
					"limit 10";
				$.ajax({
					url: baseUrl + "/query?" + $.param({"aql": AQL}),
					type: 'GET',
					headers: {"Ehr-Session": sessionId},
					success: function (res) {
						var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>Telesna temperatura</th></tr>";
						if (res) {
							var rows = res.resultSet;
							for (var i in rows) {
								results += "<tr><td>" + rows[i].cas + "</td><td class='text-right'>" + rows[i].temperatura_vrednost + " " 	+ rows[i].temperatura_enota + "</td>";
							}
							results += "</table>";
							$("#rezultatMeritveVitalnihZnakov").append(results);
						} else {
							$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
						}

					},
					error: function() {
						$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
						console.log(JSON.parse(err.responseText).userMessage);
					}
				});
			}
		},
		error: function(err) {
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}

function AQLquerry(ehrId){
  var utrip="p/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value";
  var temp="t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value";
	
	var AQL = 
		"select " +
			"t/data[at0002]/events[at0003]/time/value as cas, " +
			"t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude as vrednost, " +
			"t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/units as enota " +
		"from EHR e[e/ehr_id/value='" + ehrId + "'] " +
		"contains OBSERVATION t[openEHR-EHR-OBSERVATION.body_temperature.v1] " +
		"where t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude<35 " +
		"order by t/data[at0002]/events[at0003]/time/value desc " +
		"limit 10";
	$.ajax({
		url: baseUrl + "/query?" + $.param({"aql": AQL}),
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (res) {
			var results = "<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>Telesna temperatura</th></tr>";
			if (res) {
				var rows = res.resultSet;
				for (var i in rows) {
					results += "<tr><td>" + rows[i].cas + "</td><td class='text-right'>" + rows[i].vrednost + " " 	+ rows[i].enota + "</td>";
				}
				results += "</table>";
				$("#rezultatMeritveVitalnihZnakov").append(results);
			} else {
				$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
			}

		},
		error: function() {
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}


$(document).ready(function() {
	$('#preberiObstojeciEHR').change(function() {
		$("#preberiSporocilo").html("");
		$("#preberiEHRid").val($(this).val());
	});
	$('#preberiPredlogoBolnika').change(function() {
		$("#kreirajSporocilo").html("");
		var podatki = $(this).val().split(",");
		$("#kreirajIme").val(podatki[0]);
		$("#kreirajPriimek").val(podatki[1]);
		$("#kreirajDatumRojstva").val(podatki[2]);
	});
	$('#preberiObstojeciVitalniZnak').change(function() {
		$("#dodajMeritveVitalnihZnakovSporocilo").html("");
		var podatki = $(this).val().split("|");
		$("#dodajVitalnoEHR").val(podatki[0]);
		$("#dodajVitalnoDatumInUra").val(podatki[1]);
		$("#dodajVitalnoTelesnaVisina").val(podatki[2]);
		$("#dodajVitalnoTelesnaTeza").val(podatki[3]);
		$("#dodajVitalnoTelesnaTemperatura").val(podatki[4]);
		$("#dodajVitalnoKrvniTlakSistolicni").val(podatki[5]);
		$("#dodajVitalnoKrvniTlakDiastolicni").val(podatki[6]);
		$("#dodajVitalnoNasicenostKrviSKisikom").val(podatki[7]);
		$("#dodajVitalnoMerilec").val(podatki[8]);
	});
	$('#preberiEhrIdZaVitalneZnake').change(function() {
		$("#preberiMeritveVitalnihZnakovSporocilo").html("");
		$("#rezultatMeritveVitalnihZnakov").html("");
		$("#meritveVitalnihZnakovEHRid").val($(this).val());
	});
	graf();
});