export default function Licenses() {
  return (
    <div className="licenses">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Licenses & Attribution</div>
        <div className="panel-subtitle">
          Third-party content and open-source licenses used in Tavern Master.
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">D&D 5e Systems Reference Document (SRD)</div>
        <div className="panel-body">
          <p className="panel-copy">
            This application includes content from the Systems Reference Document 5.1 and 5.2.1,
            licensed under the Creative Commons Attribution 4.0 International License (CC-BY 4.0).
          </p>

          <div style={{ marginTop: "1.4rem" }}>
            <div className="panel-subtitle">SRD 5.1 (2014 Rules)</div>
            <p className="panel-copy" style={{ marginTop: "0.4rem" }}>
              This work includes material taken from the System Reference Document 5.1 ("SRD 5.1")
              by Wizards of the Coast LLC and available at{" "}
              <a
                href="https://dnd.wizards.com/resources/systems-reference-document"
                target="_blank"
                rel="noopener noreferrer"
              >
                dnd.wizards.com
              </a>
              . The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International
              License.
            </p>
          </div>

          <div style={{ marginTop: "1.4rem" }}>
            <div className="panel-subtitle">SRD 5.2.1 (2024 Rules)</div>
            <p className="panel-copy" style={{ marginTop: "0.4rem" }}>
              This work includes material taken from the System Reference Document 5.2.1 ("SRD
              5.2.1") by Wizards of the Coast LLC and available at{" "}
              <a
                href="https://www.dndbeyond.com/resources/1781-systems-reference-document-srd"
                target="_blank"
                rel="noopener noreferrer"
              >
                dndbeyond.com
              </a>
              . The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International
              License.
            </p>
          </div>

          <div style={{ marginTop: "1.4rem" }}>
            <div className="panel-subtitle">CC-BY 4.0 License</div>
            <p className="panel-copy" style={{ marginTop: "0.4rem" }}>
              You are free to share and adapt the SRD material for any purpose, even commercially,
              under the following terms: you must give appropriate credit, provide a link to the
              license, and indicate if changes were made.
            </p>
            <p className="panel-copy" style={{ marginTop: "0.4rem" }}>
              Full license:{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/legalcode"
                target="_blank"
                rel="noopener noreferrer"
              >
                creativecommons.org/licenses/by/4.0
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
