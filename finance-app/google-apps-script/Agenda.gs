/**
 * Web app do Google Apps Script para resumir plantões do Google Agenda.
 * Recebe ?mes=YYYY-MM&config=[{nome,busca,inicioDia,inicioMes,fimDia,fimMes,calculo,valor6hSemana,valor12h}]
 */
function doGet(e) {
  var mes = (e.parameter.mes || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM")).split("-");
  var ano = Number(mes[0]);
  var mesBase = Number(mes[1]) - 1;
  var locais;

  try {
    locais = JSON.parse(e.parameter.config || "[]");
  } catch (erro) {
    return resposta({ error: "Configuração inválida: " + erro.message });
  }

  // Mantém compatibilidade enquanto o site ainda não enviou configuração.
  if (!Array.isArray(locais) || !locais.length) {
    locais = [
      { nome:"Leonor", busca:"Leonor", inicioDia:1, inicioMes:-2, fimDia:31, fimMes:-2 },
      { nome:"CDT", busca:"CDT", inicioDia:1, inicioMes:0, fimDia:31, fimMes:0 },
      { nome:"SEPACO", busca:"SEPACO", inicioDia:1, inicioMes:0, fimDia:31, fimMes:0 }
    ];
  }

  var agenda = CalendarApp.getDefaultCalendar();
  var plantoes = {};
  var periodos = {};

  locais.forEach(function(local) {
    var inicio = dataLimite(ano, mesBase, Number(local.inicioMes) || 0, Number(local.inicioDia) || 1, false);
    var fimInclusivo = dataLimite(ano, mesBase, Number(local.fimMes) || 0, Number(local.fimDia) || 31, true);
    var fimConsulta = new Date(fimInclusivo.getFullYear(), fimInclusivo.getMonth(), fimInclusivo.getDate() + 1);
    var termos = String(local.busca || local.nome || "").toLowerCase().split("|").map(function(t){ return t.trim(); }).filter(String);
    var eventos = agenda.getEvents(inicio, fimConsulta).filter(function(evento) {
      var texto = (evento.getTitle() + " " + evento.getDescription()).toLowerCase();
      return termos.some(function(termo){ return texto.indexOf(termo) !== -1; });
    });
    var horas = eventos.reduce(function(total, evento) {
      return total + Math.max(0, (evento.getEndTime().getTime() - evento.getStartTime().getTime()) / 3600000);
    }, 0);

    if (local.calculo === "plantao-faixa") {
      var qtd6hSemana = 0;
      var qtd12h = 0;
      var eventosNaoClassificados = 0;
      eventos.forEach(function(evento) {
        var inicioEvento = evento.getStartTime();
        var fimEvento = evento.getEndTime();
        var duracao = (fimEvento.getTime() - inicioEvento.getTime()) / 3600000;
        var diaSemana = inicioEvento.getDay();
        var curtoDiaUtil = diaSemana >= 1 && diaSemana <= 5 && inicioEvento.getHours() === 7 && inicioEvento.getMinutes() === 0 && fimEvento.getHours() === 13 && fimEvento.getMinutes() === 0 && Math.abs(duracao - 6) < 0.1;
        if (curtoDiaUtil) qtd6hSemana++;
        else if (Math.abs(duracao - 12) < 0.1) qtd12h++;
        else eventosNaoClassificados++;
      });
      plantoes[local.nome] = {
        n: eventos.length,
        horas: arredondar(horas),
        valor: qtd6hSemana * (Number(local.valor6hSemana) || 0) + qtd12h * (Number(local.valor12h) || 0),
        qtd6hSemana: qtd6hSemana,
        qtd12h: qtd12h,
        eventosNaoClassificados: eventosNaoClassificados
      };
    } else {
      plantoes[local.nome] = { n: arredondar(horas / 12), horas: arredondar(horas) };
    }
    periodos[local.nome] = { inicio: formatar(inicio), fim: formatar(fimInclusivo) };
  });

  return resposta({ plantoes:plantoes, periodos:periodos });
}

function dataLimite(ano, mesBase, deslocamento, dia, usarUltimoDia) {
  var primeiro = new Date(ano, mesBase + deslocamento, 1);
  var ultimoDia = new Date(primeiro.getFullYear(), primeiro.getMonth() + 1, 0).getDate();
  var diaValido = usarUltimoDia && dia >= 31 ? ultimoDia : Math.min(Math.max(dia, 1), ultimoDia);
  return new Date(primeiro.getFullYear(), primeiro.getMonth(), diaValido);
}

function formatar(data) {
  return Utilities.formatDate(data, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function arredondar(valor) {
  return Math.round(valor * 10) / 10;
}

function resposta(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
