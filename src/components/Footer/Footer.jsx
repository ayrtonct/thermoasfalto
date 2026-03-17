import styles from './Footer.module.css';

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      {/* Bloco 1 — identidade do projeto */}
      <div className={styles.blockOne}>
        THERMOASFALTO &middot; PIBIC 2025/26 &middot; São Luís - MA
      </div>

      {/* Bloco 2 — laboratórios */}
      <div className={styles.blockTwo}>
        <div className={styles.labs}>
          <span>Lab. de Aquisição e Processamento de Sinais</span>
          <span className={styles.separator}>|</span>
          <span>Lab. de Mecânica dos Solos e Pavimentação</span>
        </div>
        <div className={styles.instituicao}>
          UEMA &middot; CCT &middot; Engenharia da Computação
        </div>
      </div>

      {/* Bloco 3 — equipe */}
      <div className={styles.blockThree}>
        <div className={styles.teamMember}>
          <span className={styles.label}>Orientadora:</span> Prof.ª Dr.ª Mayssa Alves da Silva
        </div>
        <div className={styles.teamMember}>
          <span className={styles.label}>Bolsista:</span> Ayrton César Teixeira e Silva
        </div>
      </div>
    </footer>
  );
};
