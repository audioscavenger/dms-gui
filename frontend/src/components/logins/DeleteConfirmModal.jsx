import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from '../Button';
import FormField from '../FormField';
import Translate from '../Translate';

const DeleteConfirmModal = ({
  show,
  selectedLogin,
  onAlsoDeleteMailboxChange,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {/* selectedLogin is null by default, must use ? */}
          {Translate('logins.confirmDeleteTitle')}: {selectedLogin?.username} / {selectedLogin?.mailbox}{' '}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {selectedLogin && ( // Ensure selectedLogin exists before rendering form
          <>
            <p>{Translate('logins.confirmDeleteBody')}</p>
            {!!selectedLogin?.isAccount && selectedLogin?.mailbox && ( // Ensure selectedLogin has a mailbox and isAccount
              <FormField
                type="checkbox"
                id="alsoDeleteMailbox"
                name="alsoDeleteMailbox"
                label="logins.confirmAlsoDeleteMailbox"
                onChange={onAlsoDeleteMailboxChange}
                isChecked={!!selectedLogin?.alsoDeleteMailbox}
              />
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onClose}
          text="common.cancel"
        />
        <Button
          variant="danger"
          onClick={onConfirm}
          text="logins.deleteLogin"
        />
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteConfirmModal;